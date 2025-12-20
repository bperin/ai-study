import { Injectable, NotFoundException } from '@nestjs/common';
import { ParallelGenerationService } from '../ai/parallel-generation.service';
import { GcsService } from './gcs.service';
import { PdfTextService } from './pdf-text.service';
import { GEMINI_MODEL } from '../constants/models';
import { TEST_PLAN_CHAT_PROMPT } from '../ai/prompts';
import { createAdkRunner } from '../ai/adk.helpers';
import { PdfsRepository } from './pdfs.repository';
import { TestsRepository } from '../tests/tests.repository';
import { RagRepository } from '../rag/rag.repository';
import { CreatePdfRecordDto } from './dto/create-pdf-record.dto';
import { CreatePdfSessionDto } from './dto/create-pdf-session.dto';
import { UpdatePdfSessionDto } from './dto/update-pdf-session.dto';
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const os = require('os');

import { RetrieveService } from '../rag/services/retrieve.service';
import { PdfStatusGateway } from '../pdf-status.gateway';

@Injectable()
export class PdfsService {
  constructor(
    private readonly pdfsRepository: PdfsRepository,
    private readonly testsRepository: TestsRepository,
    private readonly ragRepository: RagRepository,
    private readonly parallelGenerationService: ParallelGenerationService,
    private readonly gcsService: GcsService,
    private readonly pdfTextService: PdfTextService,
    private readonly retrieveService: RetrieveService,
    private readonly pdfStatusGateway: PdfStatusGateway,
  ) {}

  async generateFlashcards(pdfId: string, userId: string, userPrompt: string) {
    // 1. Get PDF from database
    const pdf = await this.pdfsRepository.findPdfForUser(pdfId, userId);

    if (!pdf) {
      throw new NotFoundException('PDF not found');
    }

    // Create a session to track this generation event
    const sessionDto = new CreatePdfSessionDto();
    sessionDto.pdfId = pdfId;
    sessionDto.userId = userId;
    sessionDto.userPreferences = { prompt: userPrompt };
    sessionDto.status = 'generating';
    const session = await this.pdfsRepository.createPdfSession(sessionDto);

    // Notify client that generation has started
    this.pdfStatusGateway.sendStatusUpdate(userId, true);

    // 2. Use parallel generation for faster results
    console.log(`PDF record for generation:`, {
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

    // Run in background to avoid dashboard timeouts
    // We use setImmediate to detach execution from the request cycle
    // to prevent cancellation if the request is aborted/refreshed
    setImmediate(async () => {
      try {
        console.log(`[Background] Starting flashcard generation for PDF ${pdfId}`);
        await this.parallelGenerationService.generateFlashcardsParallel(userPrompt, pdfId, pdf.filename, gcsPathOrContent);

        // Update session as completed
        const updateDto = new UpdatePdfSessionDto();
        updateDto.status = 'completed';
        await this.pdfsRepository.updatePdfSession(session.id, updateDto);
        this.pdfStatusGateway.sendStatusUpdate(userId, false);
        console.log(`[Background] Flashcard generation completed for PDF ${pdfId}`);
      } catch (e: any) {
        this.pdfStatusGateway.sendStatusUpdate(userId, false);
        console.error(`[Background] Flashcard generation failed for PDF ${pdfId}:`, e);
        try {
          // If we managed to generate some questions, mark as ready instead of failed
          const questionsCount = await this.testsRepository.countMcqsByPdfId(pdfId);

          const updateDto = new UpdatePdfSessionDto();
          updateDto.status = questionsCount > 0 ? 'completed' : 'failed';
          await this.pdfsRepository.updatePdfSession(session.id, updateDto);
        } catch (updateError: any) {
          console.error(`[Background] Failed to update session status to failed: ${updateError.message}`);
        }
      }
    });

    return {
      message: 'Flashcard generation started in background',
      status: 'generating',
    };
  }

  async getObjectives(pdfId: string) {
    return this.testsRepository.findObjectivesByPdfId(pdfId);
  }

  async listPdfs(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([this.pdfsRepository.listUserPdfsWithObjectives(userId, skip, limit), this.pdfsRepository.countUserPdfs(userId)]);

    // Fetch related RAG document statuses
    const bucketName = this.gcsService.getBucketName();
    const gcsUris = data.map((p) => (p.gcsPath ? `gcs://${bucketName}/${p.gcsPath}` : null)).filter(Boolean) as string[];

    const ragDocs = await this.ragRepository.findDocumentsForSources(
      data.map((p) => p.filename),
      gcsUris,
    );

    const pdfIds = data.map((p) => p.id);
    const attempts = await this.testsRepository.findCompletedAttemptsByPdfIds(pdfIds);

    const dataWithStats = data.map((pdf) => {
      const pdfAttempts = attempts.filter((a) => a.pdfId === pdf.id);
      // Filter out 0% attempts to avoid showing bugged/empty submissions in stats
      const validAttempts = pdfAttempts.filter((a) => (a.percentage || 0) > 0);

      // Match RAG status
      const fullGcsUri = pdf.gcsPath ? `gcs://${bucketName}/${pdf.gcsPath}` : null;
      const ragStatus = ragDocs.find((d) => d.sourceUri === fullGcsUri || d.title === pdf.filename)?.status || 'UNKNOWN';

      if (validAttempts.length === 0) {
        return {
          ...pdf,
          status: ragStatus as any,
          stats: { attemptCount: 0, avgScore: 0, topScorer: null, topScore: null },
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
      };
    });

    return {
      data: dataWithStats,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async listAllPdfs(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([this.pdfsRepository.listAllPdfsWithObjectives(skip, limit), this.pdfsRepository.countAllPdfs()]);

    // Fetch related RAG document statuses
    const bucketName = this.gcsService.getBucketName();
    const gcsUris = data.map((p) => (p.gcsPath ? `gcs://${bucketName}/${p.gcsPath}` : null)).filter(Boolean) as string[];

    const ragDocs = await this.ragRepository.findDocumentsForSources(
      data.map((p) => p.filename),
      gcsUris,
    );

    const pdfIds = data.map((p) => p.id);
    const attempts = await this.testsRepository.findCompletedAttemptsByPdfIds(pdfIds);

    const dataWithStats = data.map((pdf) => {
      const pdfAttempts = attempts.filter((a) => a.pdfId === pdf.id);
      // Filter out 0% attempts to avoid showing bugged/empty submissions in stats
      const validAttempts = pdfAttempts.filter((a) => (a.percentage || 0) > 0);

      // Match RAG status
      const fullGcsUri = pdf.gcsPath ? `gcs://${bucketName}/${pdf.gcsPath}` : null;
      const ragStatus = ragDocs.find((d) => d.sourceUri === fullGcsUri || d.title === pdf.filename)?.status || 'UNKNOWN';

      if (validAttempts.length === 0) {
        return {
          ...pdf,
          status: ragStatus as any,
          stats: { attemptCount: 0, avgScore: 0, topScorer: null, topScore: null },
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
      };
    });

    return {
      data: dataWithStats,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async forkPdf(pdfId: string, userId: string, newTitle?: string) {
    const originalPdf = await this.pdfsRepository.findPdfById(pdfId);
    if (!originalPdf) throw new NotFoundException('PDF not found');

    // Create a new PDF record pointing to the same content/storage
    const dto = new CreatePdfRecordDto();
    dto.userId = userId;
    dto.filename = newTitle || `${originalPdf.filename} (Copy)`;
    dto.content = originalPdf.content;
    dto.gcsPath = originalPdf.gcsPath;
    const newPdf = await this.pdfsRepository.createPdf(dto);

    return newPdf;
  }

  async deletePdf(pdfId: string) {
    const pdf = await this.pdfsRepository.findPdfById(pdfId);
    if (!pdf) throw new NotFoundException('PDF not found');

    // Delete related data first
    await this.testsRepository.deletePdfRelatedData(pdfId);

    // Delete PDF sessions
    await this.pdfsRepository.deleteSessionsByPdf(pdfId);

    // Finally delete the PDF itself
    await this.pdfsRepository.deletePdf(pdfId);

    return {
      message: 'PDF and all associated data deleted successfully',
      pdfId,
      filename: pdf.filename,
    };
  }

  async chatPlan(message: string, pdfId: string, userId: string, history?: any[]) {
    // Get PDF info
    const pdf = await this.pdfsRepository.findPdfById(pdfId);
    if (!pdf) throw new NotFoundException('PDF not found');

    // Extract PDF text content for the agent
    let pdfContent = '';
    if (pdf.gcsPath) {
      try {
        const buffer = await this.gcsService.downloadFile(pdf.gcsPath);
        const extracted = await this.pdfTextService.extractText(buffer);
        pdfContent = extracted.structuredText.substring(0, 50000); // Limit to 50k chars
      } catch (e) {
        console.error(`Failed to extract PDF text (ID: ${pdfId}):`, e);
        // Continue without content
      }
    }

    const adkRunner = createAdkRunner();
    let useADK = !!adkRunner;
    console.log(useADK ? '[Chat Service] ✅ ADK available - using ADK agent' : '[Chat Service] ❌ ADK not available - using direct Gemini fallback');

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
        console.error('[Chat Service] ❌ ADK agent failed, falling back to direct Gemini:', adkError);
        useADK = false;
      }
    }

    if (!useADK) {
      // Direct Gemini fallback
      console.log('[Chat Service] 🔄 Using direct Gemini fallback');
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

    console.log('[Chat Service] Raw LLM response from Gemini:', {
      responseLength: response.length,
      responsePreview: response.substring(0, 500),
      fullResponse: response,
    });

    // Try to parse JSON from response
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        console.log('[Chat Service] Found JSON in response, parsing:', jsonMatch[0]);
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('[Chat Service] Parsed JSON result:', parsed);

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
      console.log('[Chat Service] Failed to parse JSON from response:', e);
      // If not JSON, return as plain message
    }

    const finalResult = {
      message: response,
      testPlan: null,
      shouldGenerate: false,
    };
    console.log('[Chat Service] Returning plain message result:', finalResult);
    return finalResult;
  }

  async autoGenerateTestPlan(pdfId: string, userId: string) {
    // Get PDF info
    const pdf = await this.pdfsRepository.findPdfById(pdfId);
    if (!pdf) throw new NotFoundException('PDF not found');

    // Extract PDF text content
    let pdfContent = '';
    if (pdf.gcsPath) {
      try {
        const buffer = await this.gcsService.downloadFile(pdf.gcsPath);
        const extracted = await this.pdfTextService.extractText(buffer);
        pdfContent = extracted.structuredText.substring(0, 50000);
      } catch (e) {
        console.error(`Failed to extract PDF text (ID: ${pdfId}):`, e);
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
      console.error('Failed to parse auto-generated test plan:', e);
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
