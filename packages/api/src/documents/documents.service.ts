import { Injectable, NotFoundException } from '@nestjs/common';
import { GcsService } from '../uploads/gcs.service';
import { GEMINI_MODEL } from '../constants/models';
import { TEST_PLAN_CHAT_PROMPT } from '../ai/prompts';
import * as agents from '../ai/agents';
import { DocumentsRepository } from './documents.repository';
import { TestsRepository } from '../tests/tests.repository';
import { GenAiService } from '../ai/genai.service';

import { PdfStatusGateway } from '../pdf-status.gateway';
import { FileSearchService } from '../uploads/file-search.service';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly documentsRepository: DocumentsRepository,
    private readonly testsRepository: TestsRepository,
    private readonly gcsService: GcsService,
    private readonly fileSearchService: FileSearchService,
    private readonly pdfStatusGateway: PdfStatusGateway,
    private readonly genAiService: GenAiService,
  ) {}

  async getRagStatus(documentId: string) {
    const pdf = await this.documentsRepository.findDocumentById(documentId);

    if (!pdf) {
      throw new NotFoundException('PDF not found');
    }

    return {
      documentId,
      status: (pdf as any).ragStatus || 'NOT_FOUND',
      document: (pdf as any).storeId
        ? {
            id: (pdf as any).fileId || (pdf as any).storeId,
            status: (pdf as any).ragStatus || 'READY',
            errorMessage: null,
            updatedAt: pdf.createdAt,
          }
        : null,
    };
  }

  async listDocuments(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([this.documentsRepository.listUserDocumentsWithObjectives(userId, skip, limit), this.documentsRepository.countUserDocuments(userId)]);

    const dataWithStats = data.map((pdf) => {
      const questionCount = (pdf as any).evals?.reduce((sum, e) => sum + (e._count?.items || 0), 0) || 0;
      const ragStatus = (pdf as any).ragStatus || 'UNKNOWN';

      return {
        ...pdf,
        questionCount,
        status: ragStatus as any,
        stats: { attemptCount: 0, avgScore: 0, topScorer: null, topScore: null },
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

  async listAllDocuments(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([this.documentsRepository.listAllDocumentsWithObjectives(skip, limit), this.documentsRepository.countAllDocuments()]);

    const dataWithStats = data.map((pdf) => {
      const questionCount = (pdf as any).evals?.reduce((sum, e) => sum + (e._count?.items || 0), 0) || 0;
      const ragStatus = (pdf as any).ragStatus || 'UNKNOWN';

      return {
        ...pdf,
        questionCount,
        status: ragStatus as any,
        stats: { attemptCount: 0, avgScore: 0, topScorer: null, topScore: null },
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

  async forkPdf(documentId: string, userId: string, newTitle?: string) {
    const originalPdf = await this.documentsRepository.findDocumentById(documentId);
    if (!originalPdf) throw new NotFoundException('PDF not found');

    const newPdf = await this.documentsRepository.createDocument(userId, newTitle || `${originalPdf.filename} (Copy)`, originalPdf.storagePath, originalPdf.content);

    return newPdf;
  }

  async deleteDocument(documentId: string) {
    const pdf = await this.documentsRepository.findDocumentById(documentId);
    if (!pdf) throw new NotFoundException('PDF not found');

    await this.testsRepository.deleteDocumentRelatedData(documentId);
    await this.documentsRepository.deleteSessionsByDocument(documentId);
    await this.documentsRepository.deleteDocument(documentId);

    return {
      message: 'PDF and all associated data deleted successfully',
      documentId,
      filename: pdf.filename,
    };
  }

  async chatPlan(message: string, documentId: string, userId: string, history?: any[]) {
    const pdf = await this.documentsRepository.findDocumentById(documentId);
    if (!pdf) throw new NotFoundException('PDF not found');

    let pdfContent = '';
    if (pdf.storagePath) {
      // PDF text extraction skipped
    }

    let response = '';

    try {
      const conversationHistory = history || [];
      let conversationContext = '';
      if (conversationHistory.length > 0) {
        conversationContext = '\n\nPrevious conversation:\n' + conversationHistory.map((msg) => `${msg.role}: ${msg.content}`).join('\n');
      }

      const fullMessage = `${conversationContext}\n\nStudent's message: ${message}`;
      const result = await agents.runTestPlanChat(this.genAiService, fullMessage, pdf.filename, (pdf as any).storeId || undefined);
      response = result.text;
    } catch (error) {
      console.error('[Chat Service] ❌ Agent failed, falling back to direct generation:', error);
      const conversationHistory = history || [];
      let conversationContext = '';
      if (conversationHistory.length > 0) {
        conversationContext = '\n\nPrevious conversation:\n' + conversationHistory.map((msg) => `${msg.role}: ${msg.content}`).join('\n');
      }

      const prompt = TEST_PLAN_CHAT_PROMPT(pdf.filename, pdfContent, conversationContext, message);
      const result = await this.genAiService.generateAnswer('You are a helpful study assistant.', '', prompt);
      response = result.text;
    }

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
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
    } catch (e) {}

    return {
      message: response,
      testPlan: null,
      shouldGenerate: false,
    };
  }

  async autoGenerateTestPlan(documentId: string, userId: string) {
    const pdf = await this.documentsRepository.findDocumentById(documentId);
    if (!pdf) throw new NotFoundException('PDF not found');

    let pdfContent = '';
    if (pdf.storagePath) {
        // PDF text extraction skipped
    }

    const autoGenPrompt = `Based on the PDF content, automatically generate a comprehensive test plan. Create a balanced mix of easy, medium, and hard questions covering the main topics. Respond with a complete test plan in JSON format.`;
    const result = await agents.runTestPlanChat(this.genAiService, autoGenPrompt, pdf.filename, (pdf as any).storeId || undefined);
    const response = result.text;

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

    return {
      message: 'Auto-generated basic test plan',
      testPlan: {
        objectives: [
          { title: 'Main Concepts', difficulty: 'medium', questionCount: 10, topics: ['Key concepts from the study material'] },
          { title: 'Application Questions', difficulty: 'hard', questionCount: 5, topics: ['Applied knowledge and critical thinking'] },
        ],
        totalQuestions: 15,
        estimatedTime: '20-25 minutes',
        summary: 'Auto-generated test covering main concepts and applications',
      },
      shouldGenerate: false,
    };
  }
}
