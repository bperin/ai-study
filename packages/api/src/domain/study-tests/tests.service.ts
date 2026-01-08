import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Mcq } from '@prisma/client';
import { SubmitTestDto } from './dto/submit-test.dto';
import { TestHistoryResponseDto, TestHistoryItemDto } from './dto/test-results.dto';
import { TestStatsDto } from './dto/test-stats.dto';
import { ChatAssistanceResponseDto } from './dto/chat-assistance.dto';
import { GEMINI_MODEL } from '../constants/models';
import { GcsService } from '../uploads/gcs.service';
import { TestsRepository } from './tests.repository';
import { DocumentsRepository } from '../documents/documents.repository';
import { FileSearchService } from '../uploads/file-search.service';

@Injectable()
export class TestsService {
  constructor(
    private readonly configService: ConfigService,
    private readonly testsRepository: TestsRepository,
    private readonly documentsRepository: DocumentsRepository,
    private readonly fileSearchService: FileSearchService,
    private gcsService?: GcsService,
  ) {}

  async submitTest(userId: string, dto: SubmitTestDto) {
    // 1. Fetch MCQs to check answers
    const mcqIds = dto.userAnswers.map((a) => a.mcqId);
    const mcqs = await this.testsRepository.findMcqsByIds(mcqIds);
    const mcqMap = new Map<string, Mcq>(mcqs.map((m) => [m.id, m]));

    // 2. Calculate score and prepare answers
    let score = 0;
    const answerData = dto.userAnswers.map((answer) => {
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
    const total = dto.userAnswers.length;

    return this.testsRepository.createCompletedAttempt(userId, dto.documentId, score, total, answerData);
  }

  async getTestHistory(userId: string): Promise<TestHistoryResponseDto> {
    const attempts = await this.testsRepository.findUserAttempts(userId);
    return TestHistoryResponseDto.fromEntities(attempts);
  }

  async getAllTestHistory(): Promise<TestHistoryResponseDto> {
    const attempts = await this.testsRepository.findAllAttemptsWithDetails();
    return TestHistoryResponseDto.fromEntities(attempts);
  }

  async getTestStats(documentId: string) {
    const attempts = await this.testsRepository.findCompletedAttemptsByDocument(documentId);

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
    const genAI = new GoogleGenerativeAI(this.configService.get<string>('google.apiKey'));
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const mcq = await this.testsRepository.findMcqById(questionId);
    if (!mcq) throw new NotFoundException('Question not found');

    const { TEST_ASSISTANCE_CHAT_PROMPT } = require('../ai/prompts');
    const systemPrompt = TEST_ASSISTANCE_CHAT_PROMPT(mcq.question, mcq.options);

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
    if (pdf.content && pdf.content.length > 0) {
      return pdf.content.substring(0, 10000);
    }

    const text = pdf.content || '';
    return text.substring(0, 10000);
  }

  private async buildRagContext(message: string, questionText: string, pdf: { ragFileUri?: string | null }) {
    if (!pdf.ragFileUri) {
      return '';
    }

    try {
      const snippets = await this.fileSearchService.retrieveContext({
        fileUri: pdf.ragFileUri,
        query: `${message}\n\nQuestion: ${questionText}`,
        maxSnippets: 4,
      });

      if (!snippets.length) {
        return '';
      }

      return snippets.map((snippet: any, idx: number) => `[Context ${idx + 1}]\n${snippet.content}`).join('\n\n');
    } catch (error) {
      console.error('[AI Tutor][RAG] Failed to build File Search context:', error);
      return '';
    }
  }

  async getChatAssistance(message: string, questionId: string, documentId: string, userId: string) {
    console.log(`[AI Tutor] Starting chat assistance for user ${userId}, question ${questionId}, PDF ${documentId}`);
    console.log(`[AI Tutor] User message: "${message}"`);

    try {
      // Get the question and PDF info
      const question = await this.testsRepository.findMcqById(questionId);

      if (!question) {
        throw new NotFoundException('Question not found');
      }

      const pdf = await this.documentsRepository.findDocumentById(documentId);

      if (!pdf) {
        throw new NotFoundException('PDF not found');
      }

      // Direct Gemini fallback for AI tutor
      console.log('[AI Tutor] 🔄 Using direct Gemini fallback');

      if (pdf.ragFileUri) {
        const response = await this.fileSearchService.answerQuestionFromFile({
          fileUri: pdf.ragFileUri,
          question: `${question.question}\n\nUser: ${message}`,
          systemPrompt: 'Provide coaching and hints based on the attached PDF without revealing the correct answer.',
        });

        return {
          message: response.text,
          questionContext: question.question,
          helpful: true,
        } as ChatAssistanceResponseDto;
      }

      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const { TEST_ASSISTANCE_CHAT_PROMPT } = require('../ai/prompts');

      const genAI = new GoogleGenerativeAI(this.configService.get<string>('google.apiKey'));
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

      const prompt = TEST_ASSISTANCE_CHAT_PROMPT(question.question, question.options) + `\n\nUser: ${message}`;

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
