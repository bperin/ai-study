import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Mcq } from '@prisma/client';
import { McqRepository } from '../shared/repositories/mcq.repository';
import { TestAttemptRepository } from '../shared/repositories/test-attempt.repository';
import { UserAnswerRepository } from '../shared/repositories/user-answer.repository';
import { PdfRepository } from '../shared/repositories/pdf.repository';
import { SubmitTestDto } from './dto/submit-test.dto';
import { TestHistoryResponseDto, TestHistoryItemDto } from './dto/test-results.dto';
import { AdkRunnerService } from '../ai/adk-runner.service';
import { TestStatsDto } from './dto/test-stats.dto';
import { ChatAssistanceResponseDto } from './dto/chat-assistance.dto';
import { GEMINI_MODEL } from '../constants/models';
import { GcsService } from '../pdfs/gcs.service';
import { PdfTextService } from '../shared/services/pdf-text.service';
import { RetrieveService } from '../rag/services/retrieve.service';
import { ParallelGenerationService } from '../ai/parallel-generation.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import * as pdfParse from 'pdf-parse';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class TestsService {
  constructor(
    private readonly mcqRepository: McqRepository,
    private readonly testAttemptRepository: TestAttemptRepository,
    private readonly userAnswerRepository: UserAnswerRepository,
    private readonly pdfRepository: PdfRepository,
    private readonly parallelGenerationService: ParallelGenerationService,
    private readonly queueService: QueueService,
    private adkRunner?: AdkRunnerService,
    private gcsService?: GcsService,
    private pdfTextService?: PdfTextService,
    private retrieveService?: RetrieveService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger?: Logger,
  ) {}

  async submitTest(userId: string, dto: SubmitTestDto) {
    this.logger?.info('Submitting test', { userId, answerCount: dto.userAnswers.length });
    
    // 1. Validate all MCQs exist
    const mcqIds = dto.userAnswers.map((a) => a.mcqId);
    const mcqs = await this.mcqRepository.findMany({ id: { in: mcqIds } });

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

    const attempt = await this.testAttemptRepository.create({
      user: { connect: { id: userId } },
      pdf: { connect: { id: dto.pdfId } },
      totalQuestions: total,
      percentage: Math.round((score / total) * 100),
      completedAt: new Date(),
    });

    await this.userAnswerRepository.createMany({
      data: answerData.map((answer) => ({
        attemptId: attempt.id,
        mcqId: answer.mcqId,
        selectedIdx: answer.selectedIdx,
        isCorrect: answer.isCorrect,
      })),
    });

    // Queue background analysis
    await this.queueService.addTestAnalysisJob({
      testId: attempt.id,
      userId,
    });

    return attempt;
  }

  async getTestHistory(userId: string): Promise<TestHistoryResponseDto> {
    this.logger?.info('Getting test history', { userId });
    
    const attempts = await this.testAttemptRepository.findByUserWithStats(userId);

    return TestHistoryResponseDto.fromEntities(attempts);
  }

  async getAllTestHistory(): Promise<TestHistoryResponseDto> {
    const attempts = await this.testAttemptRepository.findAllWithStats();

    return TestHistoryResponseDto.fromEntities(attempts);
  }

  async getTestStats(pdfId: string) {
    const attempts = await this.testAttemptRepository.findByPdfWithStats(pdfId);

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
    const attempt = await this.testAttemptRepository.findByIdWithStats(attemptId);

    if (!attempt || attempt.userId !== userId) {
      throw new NotFoundException('Attempt not found');
    }

    // If summary is missing, it might be being generated in the background
    const aiSummary = attempt.summary || 'AI Analysis is being generated. Please check back in a moment...';

    // Add the summary to the attempt object
    const attemptWithSummary = {
      ...attempt,
      summary: aiSummary,
      answers: attempt.userAnswers, // Ensure answers are included
    };

    return TestHistoryItemDto.fromEntity(attemptWithSummary);
  }

  async chatAssist(message: string, questionId: string, history?: any[]) {
    this.logger?.info('Chat assist requested', {
      questionId,
      message,
      historyLength: history?.length,
      history,
    });

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

    const mcq = await this.mcqRepository.findById(questionId);
    if (!mcq) throw new NotFoundException('Question not found');

    // Get PDF content - need to fetch the MCQ with objective included
    const mcqWithObjective = await this.mcqRepository.findByIdWithObjective(questionId);
    const pdf = mcqWithObjective?.objective?.pdf;
    
    // Build context: prefer RAG chunks if available, fallback to raw content
    let context = '';
    
    if (pdf) {
      // 1. Try RAG retrieval first
      // Search primarily using the question text to find the relevant section in the book
      // Adding the user's message as secondary context
      const ragContext = await this.buildRagContext(mcq.question, message, pdf);
      
      if (ragContext) {
        context = ragContext;
      } else {
        // 2. Fallback to loading raw content (from GCS or DB)
        context = await this.loadPdfContent(pdf);
      }
    }

    const { createAdkRunner, isAdkAvailable } = require('../ai/adk.helpers');
    const { TEST_ASSISTANCE_CHAT_PROMPT } = require('../ai/prompts');
    const systemPrompt = TEST_ASSISTANCE_CHAT_PROMPT(mcq.question, mcq.options, context);
    
    let useADK = isAdkAvailable();
    let response = '';

    if (useADK) {
      try {
        const { LlmAgent } = require('@google/adk');
        
        // Use createTestAssistanceAgent helper which configures tools correctly
        // We pass the context directly to it so it can build the instruction
        const { createTestAssistanceAgent } = require('../ai/agents');
        
        // Pass empty retrieveService/path because we've already built the context
        // and injected it into the prompt (systemPrompt).
        // The agent helper expects these args, so we pass minimal values.
        const agent = createTestAssistanceAgent(
          mcq.question,
          mcq.options,
          this.retrieveService, // Still passed but tool usage is secondary to context
          pdf.filename || 'Document',
          pdf.gcsPath || ''
        );
        
        // OVERRIDE the instruction with our context-rich prompt
        // This ensures consistent behavior with the fallback path
        agent.instruction = systemPrompt;

        const runner = createAdkRunner({ agent, appName: 'test-assistant' });
        
        if (runner) {
          // Construct full prompt with history for stateless execution
          const conversationHistory = (history || []).map((msg: any) => `${msg.role === 'user' ? 'Student' : 'AI Tutor'}: ${msg.content}`).join('\n');
          const fullMessage = conversationHistory ? `${conversationHistory}\n\nStudent: ${message}` : message;
          
          const result = await runner.run({
            agent,
            prompt: fullMessage
          });
          response = result.text;
        } else {
          useADK = false;
        }
      } catch (e) {
        useADK = false;
        this.logger?.warn('ADK execution failed, falling back to direct Gemini', { error: (e as Error).message });
      }
    }

    if (!useADK) {
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
        response = result.response.text();
    }

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
        this.logger?.error('Gemini API failed', { error: (error as Error).message });
        return '';
      }
    }

    const text = pdf.content || '';
    return text.substring(0, 10000);
  }

  private async buildRagContext(primarySearchTerm: string, secondarySearchTerm: string, pdf: { filename?: string; gcsPath?: string | null }) {
    if (!this.retrieveService) {
      return '';
    }

    try {
      const bucketName = process.env.GCP_BUCKET_NAME;
      const gcsUri = pdf.gcsPath && bucketName ? `gcs://${bucketName}/${pdf.gcsPath}` : null;

      const documentIdentifiers = [gcsUri ? { sourceUri: gcsUri } : null, pdf.filename ? { title: pdf.filename } : null].filter(Boolean);

      if (!documentIdentifiers.length) {
        this.logger?.info('No identifiers available to look up document; falling back to PDF text');
        return '';
      }

      const document = await this.pdfRepository.findWithDocument(pdf.filename || 'unknown');

      if (!document) {
        this.logger?.info('No matching document found for PDF; falling back to PDF text');
        return '';
      }

      // Search primarily for the question content to find the answer location in text
      const chunks = await this.retrieveService.rankChunks(
        `Question: ${primarySearchTerm}\n\nUser Hint Request: ${secondarySearchTerm}`,
        document.document?.chunks || [],
        6
      );

      if (!chunks.length) {
        this.logger?.info('No ranked chunks found; falling back to PDF text');
        return '';
      }

      this.logger?.info('Using RAG context', { chunkCount: chunks.length });
      return chunks.map((chunk) => chunk.content).join('\n\n');
    } catch (error) {
      this.logger?.error('RAG retrieval failed', { error: (error as Error).message });
      return '';
    }
  }

  async getChatAssistance(message: string, questionId: string, pdfId: string, userId: string) {
    this.logger?.info('Getting chat assistance', { userId, questionId, pdfId });
    this.logger?.info('User message: "%s"', message);

    try {
      // Get the question and PDF info
      const question = await this.mcqRepository.findById(questionId);

      if (!question) {
        throw new NotFoundException('Question not found');
      }

      const pdf = await this.pdfRepository.findById(pdfId);

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
          this.logger?.info('Using centralized ADK runner for chat assistance');

          const { LlmAgent } = require('@google/adk');
          const agent = new LlmAgent({
            name: 'ai_tutor',
            description: 'AI tutor to help students with questions',
            model: 'gemini-2.5-flash',
            instruction: `You are an AI tutor helping a student with a specific question. Your goal is to guide them to the answer without giving it away directly.

Context from the document:
${ragContext || context}`
          });

          const responseText = await this.adkRunner.runAgent(agent, userId, message, 'ai-tutor');

          return {
            message: responseText,
            questionContext: question.question,
            helpful: true,
          } as ChatAssistanceResponseDto;
        } catch (error) {
          this.logger?.error('ADK execution failed, falling back to Gemini', { error: (error as Error).message });
        }
      } else {
        this.logger?.warn('ADK not available, using Gemini fallback');
      }

      // Direct Gemini fallback for AI tutor
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
      this.logger?.error('Error in getChatAssistance', { error: (error as Error).message });
      throw error;
    }
  }
}
