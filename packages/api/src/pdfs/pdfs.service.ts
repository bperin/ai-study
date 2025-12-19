import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PdfRepository } from '../shared/repositories/pdf.repository';
import { DocumentRepository } from '../shared/repositories/document.repository';
import { ObjectiveRepository } from '../shared/repositories/objective.repository';
import { McqRepository } from '../shared/repositories/mcq.repository';
import { ParallelGenerationService } from '../ai/parallel-generation.service';
import { GcsService } from './gcs.service';
import { PdfTextService } from '../shared/services/pdf-text.service';
import { GEMINI_MODEL } from '../constants/models';
import { TEST_PLAN_CHAT_PROMPT } from '../ai/prompts';
import { createAdkRunner } from '../ai/adk.helpers';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const os = require('os');

import { RetrieveService } from '../rag/services/retrieve.service';
import { PdfStatusGateway } from '../pdf-status.gateway';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class PdfsService {
  constructor(
    private readonly pdfRepository: PdfRepository,
    private readonly documentRepository: DocumentRepository,
    private readonly objectiveRepository: ObjectiveRepository,
    private readonly mcqRepository: McqRepository,
    private readonly parallelGenerationService: ParallelGenerationService,
    private readonly gcsService: GcsService,
    private readonly pdfTextService: PdfTextService,
    private readonly retrieveService: RetrieveService,
    private readonly pdfStatusGateway: PdfStatusGateway,
    private readonly queueService: QueueService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async getRagStatus(pdfId: string) {
    this.logger.info('Getting RAG status', { pdfId });
    
    const pdf = await this.pdfRepository.findWithDocument(pdfId);

    if (!pdf) {
      throw new NotFoundException('PDF not found');
    }

    if (!pdf.document) {
      return {
        status: 'not_started',
        message: 'RAG ingestion has not been triggered',
      };
    }

    return {
      status: pdf.document.status.toLowerCase(),
      documentId: pdf.document.id,
      chunkCount: pdf.document._count.chunks,
      errorMessage: pdf.document.errorMessage,
      createdAt: pdf.document.createdAt,
      updatedAt: pdf.document.updatedAt,
    };
  }

  async generateFlashcards(pdfId: string, userId: string, userPrompt: string) {
    // 1. Get PDF from database
    const pdf = await this.pdfRepository.findById(pdfId);
    
    if (!pdf || pdf.userId !== userId) {
      throw new NotFoundException('PDF not found');
    }

    // Skip session creation for now - not implemented in repository

    // Notify client that generation has started
    this.pdfStatusGateway.sendStatusUpdate(userId, true);

    // 2. Use parallel generation for faster results
    this.logger.info('PDF record for generation', {
      id: pdf.id,
      filename: pdf.filename,
      hasGcsPath: !!pdf.gcsPath,
      gcsPath: pdf.gcsPath,
      hasContent: !!pdf.content,
      contentLength: pdf.content?.length || 0,
    });

    const gcsPathOrContent = pdf.gcsPath || pdf.content || '';
    if (!gcsPathOrContent) {
      throw new Error(`PDF ${pdf.filename} has no GCS path or content - cannot generate questions`);
    }

    // Queue flashcard generation job
    await this.queueService.addFlashcardGenerationJob({
      pdfId,
      sessionId: 'temp-session',
      userId,
      userPrompt,
      filename: pdf.filename,
      gcsPathOrContent,
    });

    return {
      message: 'Flashcard generation started in background',
      status: 'generating',
    };
  }

  async getObjectives(pdfId: string) {
    return this.objectiveRepository.findByPdfIdWithMcqs(pdfId);
  }

  async listPdfs(userId: string, page: number = 1, limit: number = 10) {
    this.logger.info('Listing PDFs for user', { userId, page, limit });
    
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.pdfRepository.findByUserId(userId, skip, limit),
      this.pdfRepository.countByUserId(userId),
    ]);

    // Fetch related RAG document statuses
    const bucketName = this.gcsService.getBucketName();
    const gcsUris = data.map((p) => (p.gcsPath ? `gcs://${bucketName}/${p.gcsPath}` : null)).filter(Boolean) as string[];

    const ragDocs = await this.documentRepository.findByGcsUrisOrTitles(gcsUris, data.map((p) => p.filename));

    const pdfIds = data.map((p) => p.id);
    const attempts = await this.pdfRepository.findAttemptsByPdfIds(pdfIds);

    // Get question counts and sample questions for each PDF
    const pdfQuestionData = await Promise.all(
      pdfIds.map(async (pdfId) => {
        const questionCount = await this.mcqRepository.countByPdfId(pdfId);
        const sampleQuestions = await this.mcqRepository.findByPdfId(pdfId);
        return {
          pdfId,
          questionCount,
          sampleQuestions: sampleQuestions.slice(0, 3).map(q => ({
            id: q.id,
            question: q.question,
            options: q.options
          })), // Get first 3 questions as samples with minimal data
        };
      })
    );

    const dataWithStats = await Promise.all(data.map(async (pdf) => {
      const pdfAttempts = attempts.filter((a) => a.pdfId === pdf.id);
      // Filter out 0% attempts to avoid showing bugged/empty submissions in stats
      const validAttempts = pdfAttempts.filter((a) => (a.percentage || 0) > 0);

      // Get question data for this PDF
      const questionData = pdfQuestionData.find((q) => q.pdfId === pdf.id);

      // Match RAG status
      const fullGcsUri = pdf.gcsPath ? `gcs://${bucketName}/${pdf.gcsPath}` : null;
      const ragStatus = ragDocs.find((d) => d.sourceUri === fullGcsUri || d.title === pdf.filename)?.status || 'UNKNOWN';

      if (validAttempts.length === 0) {
        return {
          ...pdf,
          status: ragStatus as any,
          stats: { attemptCount: 0, avgScore: 0, topScorer: null, topScore: null },
          questionCount: questionData?.questionCount || 0,
          sampleQuestions: questionData?.sampleQuestions || [],
        };
      }

      const avgScore = Math.round(validAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / validAttempts.length);
      const topAttempt = validAttempts.sort((a, b) => (b.percentage || 0) - (a.percentage || 0))[0];

      return {
        ...pdf,
        status: ragStatus as any,
        stats: {
          attemptCount: validAttempts.length,
          avgScore,
          topScorer: topAttempt.user.email.split('@')[0],
          topScore: Math.round(topAttempt.percentage || 0),
        },
        questionCount: questionData?.questionCount || 0,
        sampleQuestions: questionData?.sampleQuestions || [],
      };
    }));

    return {
      data: dataWithStats,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async listAllPdfs(page: number = 1, limit: number = 10) {
    this.logger.info('Listing all PDFs', { page, limit });
    
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.pdfRepository.findAll(skip, limit),
      this.pdfRepository.count(),
    ]);

    // Fetch related RAG document statuses
    const bucketName = this.gcsService.getBucketName();
    const gcsUris = data.map((p) => (p.gcsPath ? `gcs://${bucketName}/${p.gcsPath}` : null)).filter(Boolean) as string[];

    const ragDocs = await this.documentRepository.findByGcsUrisOrTitles(gcsUris, data.map((p) => p.filename));

    const pdfIds = data.map((p) => p.id);
    const attempts = await this.pdfRepository.findAttemptsByPdfIds(pdfIds);

    // Get question counts and sample questions for each PDF
    const pdfQuestionData = await Promise.all(
      pdfIds.map(async (pdfId) => {
        const questionCount = await this.mcqRepository.countByPdfId(pdfId);
        const sampleQuestions = await this.mcqRepository.findByPdfId(pdfId);
        return {
          pdfId,
          questionCount,
          sampleQuestions: sampleQuestions.slice(0, 3).map(q => ({
            id: q.id,
            question: q.question,
            options: q.options
          })), // Get first 3 questions as samples with minimal data
        };
      })
    );

    const dataWithStats = await Promise.all(data.map(async (pdf) => {
      const pdfAttempts = attempts.filter((a) => a.pdfId === pdf.id);
      // Filter out 0% attempts to avoid showing bugged/empty submissions in stats
      const validAttempts = pdfAttempts.filter((a) => (a.percentage || 0) > 0);

      // Get question data for this PDF
      const questionData = pdfQuestionData.find((q) => q.pdfId === pdf.id);

      // Match RAG status
      const fullGcsUri = pdf.gcsPath ? `gcs://${bucketName}/${pdf.gcsPath}` : null;
      const ragStatus = ragDocs.find((d) => d.sourceUri === fullGcsUri || d.title === pdf.filename)?.status || 'UNKNOWN';

      if (validAttempts.length === 0) {
        return {
          ...pdf,
          status: ragStatus as any,
          stats: { attemptCount: 0, avgScore: 0, topScorer: null, topScore: null },
          questionCount: questionData?.questionCount || 0,
          sampleQuestions: questionData?.sampleQuestions || [],
        };
      }

      const avgScore = Math.round(validAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / validAttempts.length);
      const topAttempt = validAttempts.sort((a, b) => (b.percentage || 0) - (a.percentage || 0))[0];

      return {
        ...pdf,
        status: ragStatus as any,
        stats: {
          attemptCount: validAttempts.length,
          avgScore,
          topScorer: topAttempt.user.email.split('@')[0],
          topScore: Math.round(topAttempt.percentage || 0),
        },
        questionCount: questionData?.questionCount || 0,
        sampleQuestions: questionData?.sampleQuestions || [],
      };
    }));

    return {
      data: dataWithStats,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async forkPdf(pdfId: string, userId: string, newTitle?: string) {
    this.logger.info('Forking PDF', { pdfId, userId, newTitle });
    
    const originalPdf = await this.pdfRepository.findById(pdfId);

    if (!originalPdf) {
      throw new NotFoundException('PDF not found');
    }

    // Create a new PDF record pointing to the same content/storage
    const newPdf = await this.pdfRepository.create({
      filename: newTitle || `${originalPdf.filename} (Copy)`,
      content: originalPdf.content,
      gcsPath: originalPdf.gcsPath,
      user: { connect: { id: userId } },
    });

    return newPdf;
  }

  async deletePdf(pdfId: string) {
    this.logger.info('Deleting PDF', { pdfId });
    
    const pdf = await this.pdfRepository.findById(pdfId);

    if (!pdf) {
      throw new NotFoundException('PDF not found');
    }

    // Delete in correct order due to foreign key constraints
    // 1. Delete user answers (linked to test attempts)
    await this.pdfRepository.deleteUserAnswersByPdfId(pdfId);

    // 2. Delete test attempts
    await this.pdfRepository.deleteAttemptsByPdfId(pdfId);

    // 3. Delete MCQs (linked to objectives)
    await this.objectiveRepository.deleteMcqsByPdfId(pdfId);

    // 4. Delete objectives
    // Delete all objectives for this PDF
    const existingObjectives = await this.objectiveRepository.findByPdfId(pdfId);
    for (const objective of existingObjectives) {
      await this.objectiveRepository.delete(objective.id);
    }

    // 5. Delete PDF sessions
    await this.pdfRepository.deleteSessionsByPdfId(pdfId);

    // 6. Finally delete the PDF itself
    await this.pdfRepository.delete(pdfId);

    return {
      message: 'PDF and all associated data deleted successfully',
      pdfId,
      filename: pdf.filename,
    };
  }

  async chatPlan(message: string, pdfId: string, userId: string, history?: any[]) {
    // Get PDF info
    const pdf = await this.pdfRepository.findById(pdfId);
    if (!pdf) throw new NotFoundException('PDF not found');

    // Extract PDF text content for the agent
    let pdfContent = '';
    if (pdf.gcsPath) {
      try {
        const buffer = await this.gcsService.downloadFile(pdf.gcsPath);
        const extracted = await this.pdfTextService.extractText(buffer);
        pdfContent = extracted.structuredText.substring(0, 50000); // Limit to 50k chars
      } catch (e) {
        this.logger.error('Failed to extract PDF text', { pdfId, error: (e as Error).message });
        // Continue without content
      }
    }

    const adkRunner = createAdkRunner();
    let useADK = !!adkRunner;
    this.logger.info(useADK ? 'ADK available - using ADK agent' : 'ADK not available - using direct Gemini fallback');

    let response = '';

    if (useADK) {
      try {
        const { createTestPlanChatAgent } = require('../ai/agents');

        const agent = createTestPlanChatAgent(this.retrieveService, pdf.filename, pdf.gcsPath || '');
        const conversationHistory = history || [];
        let conversationContext = '';
        if (conversationHistory.length > 0) {
          conversationContext = '\n\nPrevious conversation:\n' + conversationHistory.map((msg) => `${msg.role}: ${msg.content}`).join('\n');
        }

        const fullMessage = `${conversationContext}\n\nStudent's message: ${message}`;
        const result = await adkRunner.run({ agent, prompt: fullMessage });
        response = result.text;
      } catch (adkError) {
        this.logger.error('ADK agent failed, falling back to direct Gemini', { error: (adkError as Error).message });
        useADK = false;
      }
    }

    if (!useADK) {
      // Direct Gemini fallback
      this.logger.info('Using direct Gemini fallback');
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

      const conversationHistory = history || [];
      let conversationContext = '';
      if (conversationHistory.length > 0) {
        conversationContext = '\n\nPrevious conversation:\n' + conversationHistory.map((msg) => `${msg.role}: ${msg.content}`).join('\n');
      }

      const prompt = TEST_PLAN_CHAT_PROMPT(pdf.filename, pdfContent, conversationContext, message);

      const result = await model.generateContent(prompt);
      response = result.response.text();
    }

    this.logger.info('Raw LLM response from Gemini', {
      responseLength: response.length,
      responsePreview: response.substring(0, 500),
      fullResponse: response,
    });

    // Try to parse JSON from response
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        this.logger.info('Found JSON in response, parsing', { json: jsonMatch[0] });
        const parsed = JSON.parse(jsonMatch[0]);
        this.logger.info('Parsed JSON result', parsed);

        // Ensure uniform response structure
        let normalizedTestPlan = null;
        if (parsed.testPlan) {
          if (Array.isArray(parsed.testPlan)) {
            normalizedTestPlan = {
              objectives: parsed.testPlan,
              totalQuestions: parsed.testPlan.reduce((sum: number, obj: any) => sum + (obj.questionCount || 0), 0),
              estimatedTime: '15-20 mins',
              summary: 'Here is a test plan covering the key topics.',
            };
          } else {
            normalizedTestPlan = parsed.testPlan;
          }
        } else if (parsed.objectives) {
          normalizedTestPlan = parsed;
        }

        return {
          message: parsed.message || response.replace(jsonMatch[0], '').trim() || 'Here is the test plan based on your request.',
          testPlan: normalizedTestPlan,
          shouldGenerate: parsed.shouldGenerate || false,
        };
      }
    } catch (e) {
      this.logger.warn('Failed to parse JSON from response', { error: (e as Error).message });
      // If not JSON, return as plain message
    }

    const finalResult = {
      message: response,
      testPlan: null,
      shouldGenerate: false,
    };
    this.logger.info('Returning plain message result', finalResult);
    return finalResult;
  }

  async autoGenerateTestPlan(pdfId: string, userId: string) {
    // Get PDF info
    const pdf = await this.pdfRepository.findById(pdfId);
    if (!pdf) throw new NotFoundException('PDF not found');

    // Extract PDF text content
    let pdfContent = '';
    if (pdf.gcsPath) {
      try {
        const buffer = await this.gcsService.downloadFile(pdf.gcsPath);
        const extracted = await this.pdfTextService.extractText(buffer);
        pdfContent = extracted.structuredText.substring(0, 50000);
      } catch (e) {
        this.logger.error('Failed to extract PDF text in autoGenerateTestPlan', { pdfId, error: (e as Error).message });
      }
    }

    // Create ADK-based test plan agent for auto-generation
    const { createTestPlanChatAgent } = require('../ai/agents');

    const agent = createTestPlanChatAgent(this.retrieveService, pdf.filename, pdf.gcsPath || '');
    const runner = createAdkRunner();

    if (!runner) {
      throw new Error('ADK not available for auto-generating test plans');
    }

    const autoGenPrompt = `Based on the PDF content, automatically generate a comprehensive test plan. Create a balanced mix of easy, medium, and hard questions covering the main topics. Respond with a complete test plan in JSON format.`;

    const result = await runner.run({ agent, prompt: autoGenPrompt });
    const response = result.text;

    // Try to parse JSON from response
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          message: 'Auto-generated test plan based on PDF content',
          testPlan: parsed.testPlan,
          shouldGenerate: false,
        };
      }
    } catch (e) {
      this.logger.error('Failed to parse auto-generated test plan', { error: (e as Error).message });
    }

    // Fallback: create a basic test plan structure
    return {
      message: 'Auto-generated basic test plan',
      testPlan: {
        objectives: [
          {
            title: 'Main Concepts',
            difficulty: 'medium',
            questionCount: 10,
            topics: ['Key concepts from the study material'],
          },
          {
            title: 'Application Questions',
            difficulty: 'hard',
            questionCount: 5,
            topics: ['Applied knowledge and critical thinking'],
          },
        ],
        totalQuestions: 15,
        estimatedTime: '20-25 minutes',
        summary: 'Auto-generated test covering main concepts and applications',
      },
      shouldGenerate: false,
    };
  }
}
