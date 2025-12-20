import { Injectable, NotFoundException } from '@nestjs/common';
import { Mcq } from '@prisma/client';
import { SubmitTestDto } from './dto/submit-test.dto';
import { TestHistoryResponseDto, TestHistoryItemDto } from './dto/test-results.dto';
import { AdkRunnerService } from '../ai/adk-runner.service';
import { TestStatsDto } from './dto/test-stats.dto';
import { ChatAssistanceResponseDto } from './dto/chat-assistance.dto';
import { GEMINI_MODEL } from '../constants/models';
import { GcsService } from '../pdfs/gcs.service';
import { PdfTextService } from '../pdfs/pdf-text.service';
import { RetrieveService } from '../rag/services/retrieve.service';
import { TestsRepository } from './tests.repository';
import { PdfsRepository } from '../pdfs/pdfs.repository';
import { RagRepository } from '../rag/rag.repository';
import { DocumentIdentifierDto } from '../rag/dto/document-identifier.dto';
import * as pdfParse from 'pdf-parse';

@Injectable()
export class TestsService {
  constructor(
    private readonly testsRepository: TestsRepository,
    private readonly pdfsRepository: PdfsRepository,
    private readonly ragRepository: RagRepository,
    private adkRunner?: AdkRunnerService,
    private gcsService?: GcsService,
    private pdfTextService?: PdfTextService,
    private retrieveService?: RetrieveService,
  ) {}

  async submitTest(userId: string, dto: SubmitTestDto) {
    // 1. Fetch MCQs to check answers
    const mcqIds = dto.answers.map((a) => a.mcqId);
    const mcqs = await this.testsRepository.findMcqsByIds(mcqIds);
    const mcqMap = new Map<string, Mcq>(mcqs.map((m) => [m.id, m]));

    // 2. Calculate score and prepare answers
    let score = 0;
    const answerData = dto.answers.map((answer) => {
      const mcq = mcqMap.get(answer.mcqId);
      if (!mcq) throw new Error(`MCQ not found: ${answer.mcqId}`);

      const isCorrect = mcq.correctIdx === answer.selectedIdx;
      if (isCorrect) score++;

      return {
        mcqId: answer.mcqId,
        selectedIdx: answer.selectedIdx,
        isCorrect,
      };
    });

    // 3. Create Attempt
    const total = dto.answers.length;

    return this.testsRepository.createCompletedAttempt(userId, dto.pdfId, score, total, answerData);
  }

  async getTestHistory(userId: string): Promise<TestHistoryResponseDto> {
    const attempts = await this.testsRepository.findUserAttempts(userId);
    return TestHistoryResponseDto.fromEntities(attempts);
  }

  async getAllTestHistory(): Promise<TestHistoryResponseDto> {
    const attempts = await this.testsRepository.findAllAttemptsWithDetails();
    return TestHistoryResponseDto.fromEntities(attempts);
  }

  async getTestStats(pdfId: string) {
    const attempts = await this.testsRepository.findCompletedAttemptsByPdf(pdfId);

    if (attempts.length === 0) {
      return {
        attemptCount: 0,
        avgScore: 0,
        topScorer: null,
        topScore: null,
      };
    }

    const avgScore = Math.round(attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / attempts.length);
    const topAttempt = attempts[0];

    // @ts-ignore
    const email = topAttempt.user?.email || 'Unknown';

    return {
      attemptCount: attempts.length,
      avgScore,
      topScorer: email.split('@')[0],
      topScore: Math.round(topAttempt.percentage || 0),
    };
  }

  async getAttemptDetails(userId: string, attemptId: string): Promise<TestHistoryItemDto> {
    const attempt = await this.testsRepository.findAttemptById(attemptId);

    if (!attempt || attempt.userId !== userId) {
      throw new NotFoundException('Attempt not found');
    }

    // @ts-ignore
    return TestHistoryItemDto.fromEntity(attempt);
  }

  async chatAssist(message: string, questionId: string, history?: any[]) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const mcq = await this.testsRepository.findMcqById(questionId);
    if (!mcq) throw new NotFoundException('Question not found');

    // @ts-ignore
    const pdfContent = mcq.objective?.pdf?.content || ''; // Or handle GCS path if needed (simplified for now as content usually has text)

    const { TEST_ASSISTANCE_CHAT_PROMPT } = require('../ai/prompts');
    const systemPrompt = TEST_ASSISTANCE_CHAT_PROMPT(mcq.question, mcq.options, pdfContent);

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: systemPrompt }] },
        { role: 'model', parts: [{ text: 'I understand. I will help the student with this question without giving away the answer.' }] },
        ...(history || []).map((msg) => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        })),
      ],
    });

    const result = await chat.sendMessage(message);
    const response = result.response.text();

    return {
      message: response,
    };
  }

  private async loadPdfContent(pdf: { gcsPath?: string | null; content?: string | null }) {
    if (pdf.gcsPath && this.gcsService) {
      try {
        const buffer = await this.gcsService.downloadFile(pdf.gcsPath);
        if (this.pdfTextService) {
          const extracted = await this.pdfTextService.extractText(buffer);
          return extracted.structuredText.substring(0, 10000);
        }

        const parsed = await pdfParse(buffer);
        return parsed.text.substring(0, 10000);
      } catch (error) {
        console.error('[AI Tutor] Failed to extract PDF content for chat assistance:', error);
      }
    }

    const text = pdf.content || '';
    return text.substring(0, 10000);
  }

  private async buildRagContext(message: string, questionText: string, pdf: { filename?: string; gcsPath?: string | null }) {
    if (!this.retrieveService) {
      return '';
    }

    try {
      const bucketName = process.env.GCP_BUCKET_NAME;
      const gcsUri = pdf.gcsPath && bucketName ? `gcs://${bucketName}/${pdf.gcsPath}` : null;

      const identifierInputs = [gcsUri ? { sourceUri: gcsUri } : null, pdf.filename ? { title: pdf.filename } : null].filter(Boolean);

      if (!identifierInputs.length) {
        console.log('[AI Tutor][RAG] No identifiers available to look up document; falling back to PDF text');
        return '';
      }

      const identifierDtos = identifierInputs.map((ident: any) => {
        const dto = new DocumentIdentifierDto();
        dto.sourceUri = ident.sourceUri || null;
        dto.title = ident.title || null;
        return dto;
      });

      const document = await this.ragRepository.findDocumentByIdentifiers(identifierDtos, ['READY', 'COMPLETED']);

      if (!document) {
        console.log('[AI Tutor][RAG] No matching document found for PDF; falling back to PDF text');
        return '';
      }

      const chunks = await this.ragRepository.listChunksByDocument(document.id);

      const ranked = await this.retrieveService.rankChunks(`${message}\n\nQuestion: ${questionText}`, chunks, 6);

      if (!ranked.length) {
        console.log('[AI Tutor][RAG] No ranked chunks found; falling back to PDF text');
        return '';
      }

      console.log(`[AI Tutor][RAG] Using ${ranked.length} ranked chunks for context (document ${document.id})`);
      return ranked.map((chunk) => `[Chunk ${chunk.chunkIndex}]\n${chunk.content.trim()}`).join('\n\n');
    } catch (error) {
      console.error('[AI Tutor][RAG] Failed to build context; using PDF text instead:', error);
      return '';
    }
  }

  async getChatAssistance(message: string, questionId: string, pdfId: string, userId: string) {
    console.log(`[AI Tutor] Starting chat assistance for user ${userId}, question ${questionId}, PDF ${pdfId}`);
    console.log(`[AI Tutor] User message: "${message}"`);

    try {
      // Get the question and PDF info
      const question = await this.testsRepository.findMcqById(questionId);

      if (!question) {
        throw new NotFoundException('Question not found');
      }

      const pdf = await this.pdfsRepository.findPdfById(pdfId);

      if (!pdf) {
        throw new NotFoundException('PDF not found');
      }

      const pdfContent = await this.loadPdfContent(pdf);
      const ragContext = await this.buildRagContext(message, question.question, pdf);
      const context = ragContext || pdfContent;
      const contextSource = ragContext ? 'RAG chunks' : 'PDF text';

      // Try using centralized ADK runner first
      if (this.adkRunner && this.adkRunner.isAvailable()) {
        try {
          console.log('[AI Tutor] ✅ Using centralized ADK runner');

          const { createTestAssistanceAgent } = require('../ai/agents');
          const agent = createTestAssistanceAgent(question.question, question.options, context);

          const responseText = await this.adkRunner.runAgent(agent, userId, message, 'ai-tutor');

          return {
            message: responseText,
            questionContext: question.question,
            helpful: true,
          } as ChatAssistanceResponseDto;
        } catch (adkError) {
          console.error('[AI Tutor] ❌ Centralized ADK runner failed, falling back to direct Gemini:', adkError);
        }
      } else {
        console.log('[AI Tutor] ❌ ADK not available - using direct Gemini fallback');
      }

      // Direct Gemini fallback for AI tutor
      console.log('[AI Tutor] 🔄 Using direct Gemini fallback');
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const { TEST_ASSISTANCE_CHAT_PROMPT } = require('../ai/prompts');

      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

      const prompt = TEST_ASSISTANCE_CHAT_PROMPT(question.question, question.options, context) + `\n\nContext source: ${contextSource}\nUser: ${message}`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      return {
        message: response,
        questionContext: question.question,
        helpful: true,
      } as ChatAssistanceResponseDto;
    } catch (error) {
      console.error('[AI Tutor] Error in getChatAssistance:', error);
      throw error;
    }
  }
}
