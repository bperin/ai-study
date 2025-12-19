import { Injectable, NotFoundException } from '@nestjs/common';
import { Mcq } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitTestDto } from './dto/submit-test.dto';
import { TestHistoryResponseDto, TestHistoryItemDto } from './dto/test-results.dto';
import { AdkRunnerService } from '../ai/adk-runner.service';
import { TestStatsDto } from './dto/test-stats.dto';
import { ChatAssistanceResponseDto } from './dto/chat-assistance.dto';
import { GEMINI_MODEL } from '../constants/models';
import { GcsService } from '../pdfs/gcs.service';
import { PdfTextService } from '../shared/services/pdf-text.service';
import { RetrieveService } from '../rag/services/retrieve.service';
import * as pdfParse from 'pdf-parse';

@Injectable()
export class TestsService {
  constructor(
    private prisma: PrismaService,
    private adkRunner?: AdkRunnerService,
    private gcsService?: GcsService,
    private pdfTextService?: PdfTextService,
    private retrieveService?: RetrieveService,
  ) {}

  async submitTest(userId: string, dto: SubmitTestDto) {
    // 1. Validate all MCQs exist
    const mcqIds = dto.userAnswers.map((a) => a.mcqId);
    const mcqs = await this.prisma.mcq.findMany({
      where: { id: { in: mcqIds } },
    });

    if (mcqs.length !== mcqIds.length) {
      throw new Error('Some MCQs not found');
    }

    // 2. Create answer data
    const answerData = dto.userAnswers.map((answer) => {
      const mcq = mcqs.find((m) => m.id === answer.mcqId);
      const isCorrect = mcq ? mcq.correctIdx === answer.selectedIdx : false;
      return {
        mcqId: answer.mcqId,
        selectedIdx: answer.selectedIdx,
        isCorrect,
      };
    });

    const score = answerData.filter((a) => a.isCorrect).length;

    // 3. Create Attempt
    const total = dto.userAnswers.length;
    const percentage = total > 0 ? (score / total) * 100 : 0;

    return this.prisma.testAttempt.create({
      data: {
        userId,
        pdfId: dto.pdfId,
        totalQuestions: total,
        percentage,
        completedAt: new Date(),
        userAnswers: {
          create: answerData,
        },
      },
      include: {
        userAnswers: true,
      },
    });
  }

  async getTestHistory(userId: string): Promise<TestHistoryResponseDto> {
    const attempts = await this.prisma.testAttempt.findMany({
      where: { userId },
      include: {
        pdf: true,
        userAnswers: {
          include: {
            mcq: true,
          },
        },
      },
      orderBy: { completedAt: { sort: 'desc', nulls: 'last' } },
    });

    return TestHistoryResponseDto.fromEntities(attempts);
  }

  async getAllTestHistory(): Promise<TestHistoryResponseDto> {
    const attempts = await this.prisma.testAttempt.findMany({
      include: {
        pdf: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        userAnswers: {
          include: {
            mcq: true,
          },
        },
      },
      orderBy: { completedAt: { sort: 'desc', nulls: 'last' } },
    });

    return TestHistoryResponseDto.fromEntities(attempts);
  }

  async getTestStats(pdfId: string) {
    const attempts = await this.prisma.testAttempt.findMany({
      where: {
        pdfId,
        completedAt: { not: null },
      },
      include: {
        user: { select: { email: true } },
      },
      orderBy: { percentage: 'desc' },
    });

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

    return {
      attemptCount: attempts.length,
      avgScore,
      topScorer: topAttempt.user.email.split('@')[0],
      topScore: Math.round(topAttempt.percentage || 0),
    };
  }

  async getAttemptDetails(userId: string, attemptId: string): Promise<TestHistoryItemDto> {
    const attempt = await this.prisma.testAttempt.findUnique({
      where: { id: attemptId },
      include: {
        pdf: true,
        userAnswers: {
          include: {
            mcq: true,
          },
        },
      },
    });

    if (!attempt || attempt.userId !== userId) {
      throw new NotFoundException('Attempt not found');
    }

    return TestHistoryItemDto.fromEntity(attempt);
  }

  async chatAssist(message: string, questionId: string, history?: any[]) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const mcq = await this.prisma.mcq.findUnique({
      where: { id: questionId },
      include: { objective: { include: { pdf: true } } },
    });
    if (!mcq) throw new NotFoundException('Question not found');

    const pdfContent = mcq.objective.pdf.content || ''; // Or handle GCS path if needed (simplified for now as content usually has text)

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

      const documentIdentifiers = [
        gcsUri ? { sourceUri: gcsUri } : null,
        pdf.filename ? { title: pdf.filename } : null,
      ].filter(Boolean);

      if (!documentIdentifiers.length) {
        console.log('[AI Tutor][RAG] No identifiers available to look up document; falling back to PDF text');
        return '';
      }

      const document = await this.prisma.document.findFirst({
        where: {
          OR: documentIdentifiers as any,
        },
      });

      if (!document) {
        console.log('[AI Tutor][RAG] No matching document found for PDF; falling back to PDF text');
        return '';
      }

      const chunks = await this.prisma.chunk.findMany({
        where: { documentId: document.id },
        orderBy: { chunkIndex: 'asc' },
      });

      const ranked = await this.retrieveService.rankChunks(
        `${message}\n\nQuestion: ${questionText}`,
        chunks,
        6,
      );

      if (!ranked.length) {
        console.log('[AI Tutor][RAG] No ranked chunks found; falling back to PDF text');
        return '';
      }

      console.log(`[AI Tutor][RAG] Using ${ranked.length} ranked chunks for context (document ${document.id})`);
      return ranked
        .map((chunk) => `[Chunk ${chunk.chunkIndex}]\n${chunk.content.trim()}`)
        .join('\n\n');
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
      const question = await this.prisma.mcq.findUnique({
        where: { id: questionId },
        include: { objective: true }
      });

      if (!question) {
        throw new NotFoundException("Question not found");
      }

      const pdf = await this.prisma.pdf.findUnique({
        where: { id: pdfId }
      });

      if (!pdf) {
        throw new NotFoundException("PDF not found");
      }

      const pdfContent = await this.loadPdfContent(pdf);
      const ragContext = await this.buildRagContext(message, question.question, pdf);
      const context = ragContext || pdfContent;
      const contextSource = ragContext ? 'RAG chunks' : 'PDF text';

      // Try using centralized ADK runner first
      if (this.adkRunner && this.adkRunner.isAvailable()) {
        try {
          console.log('[AI Tutor] ✅ Using centralized ADK runner');

          const { createTestAssistanceAgent } = require("../ai/agents");
          const agent = createTestAssistanceAgent(
            question.question,
            question.options,
            context
          );

          const responseText = await this.adkRunner.runAgent(
            agent,
            userId,
            message,
            'ai-tutor'
          );
          
          return {
            message: responseText,
            questionContext: question.question,
            helpful: true
          } as ChatAssistanceResponseDto;

        } catch (adkError) {
          console.error('[AI Tutor] ❌ Centralized ADK runner failed, falling back to direct Gemini:', adkError);
        }
      } else {
        console.log('[AI Tutor] ❌ ADK not available - using direct Gemini fallback');
      }

      // Direct Gemini fallback for AI tutor
      console.log('[AI Tutor] 🔄 Using direct Gemini fallback');
      const { GoogleGenerativeAI } = require("@google/generative-ai");
      const { TEST_ASSISTANCE_CHAT_PROMPT } = require("../ai/prompts");

      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

      const prompt = TEST_ASSISTANCE_CHAT_PROMPT(question.question, question.options, context) +
        `\n\nContext source: ${contextSource}\nUser: ${message}`;
      
      const result = await model.generateContent(prompt);
      const response = result.response.text();

      return {
        message: response,
        questionContext: question.question,
        helpful: true
      } as ChatAssistanceResponseDto;

    } catch (error) {
      console.error("[AI Tutor] Error in getChatAssistance:", error);
      throw error;
    }
  }
}
