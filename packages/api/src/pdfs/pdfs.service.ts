import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ParallelGenerationService } from '../ai/parallel-generation.service';
import { GcsService } from './gcs.service';
import { PdfTextService } from './pdf-text.service';
import { GEMINI_MODEL } from '../constants/models';
import { TEST_PLAN_CHAT_PROMPT } from '../ai/prompts';
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const os = require('os');

@Injectable()
export class PdfsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly parallelGenerationService: ParallelGenerationService,
    private readonly gcsService: GcsService,
    private readonly pdfTextService: PdfTextService,
  ) {}

  async generateFlashcards(pdfId: string, userId: string, userPrompt: string) {
    // 1. Get PDF from database
    const pdf = await this.prisma.pdf.findFirst({
      where: { id: pdfId, userId },
    });

    if (!pdf) {
      throw new NotFoundException('PDF not found');
    }

    // Create a session to track this generation event
    const session = await this.prisma.pdfSession.create({
      data: {
        pdfId,
        userId,
        userPreferences: { prompt: userPrompt },
        status: 'generating',
      },
    });

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

    const result = await this.parallelGenerationService.generateFlashcardsParallel(userPrompt, pdfId, pdf.filename, gcsPathOrContent);

    // Update session as completed
    await this.prisma.pdfSession.update({
      where: { id: session.id },
      data: { status: 'completed' },
    });

    // 3. Fetch the created objectives from database
    const objectives = await this.prisma.objective.findMany({
      where: { pdfId },
      include: { mcqs: true },
    });

    return {
      message: 'Flashcards generated successfully with parallel agents',
      objectivesCount: result.objectivesCount,
      questionsCount: result.questionsCount,
      summary: result.summary,
      objectives,
    };
  }

  async getObjectives(pdfId: string) {
    return this.prisma.objective.findMany({
      where: { pdfId },
      include: { mcqs: true },
    });
  }

  async listPdfs(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.pdf.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          filename: true,
          createdAt: true,
          objectives: {
            select: {
              title: true,
              difficulty: true,
              _count: {
                select: { mcqs: true },
              },
            },
          },
        },
      }),
      this.prisma.pdf.count({ where: { userId } }),
    ]);

    const pdfIds = data.map((p) => p.id);
    const attempts = await this.prisma.testAttempt.findMany({
      where: {
        pdfId: { in: pdfIds },
        completedAt: { not: null },
      },
      include: {
        user: { select: { email: true } },
      },
    });

    const dataWithStats = data.map((pdf) => {
      const pdfAttempts = attempts.filter((a) => a.pdfId === pdf.id);
      if (pdfAttempts.length === 0) {
        return { ...pdf, stats: { attemptCount: 0, avgScore: 0, topScorer: null, topScore: null } };
      }

      const avgScore = Math.round(pdfAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / pdfAttempts.length);
      const topAttempt = pdfAttempts.sort((a, b) => (b.percentage || 0) - (a.percentage || 0))[0];

      return {
        ...pdf,
        stats: {
          attemptCount: pdfAttempts.length,
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
    const [data, total] = await Promise.all([
      this.prisma.pdf.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          filename: true,
          createdAt: true,
          objectives: {
            select: {
              title: true,
              difficulty: true,
              _count: {
                select: { mcqs: true },
              },
            },
          },
        },
      }),
      this.prisma.pdf.count(),
    ]);

    const pdfIds = data.map((p) => p.id);
    const attempts = await this.prisma.testAttempt.findMany({
      where: {
        pdfId: { in: pdfIds },
        completedAt: { not: null },
      },
      include: {
        user: { select: { email: true } },
      },
    });

    const dataWithStats = data.map((pdf) => {
      const pdfAttempts = attempts.filter((a) => a.pdfId === pdf.id);
      if (pdfAttempts.length === 0) {
        return { ...pdf, stats: { attemptCount: 0, avgScore: 0, topScorer: null, topScore: null } };
      }

      const avgScore = Math.round(pdfAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / pdfAttempts.length);
      const topAttempt = pdfAttempts.sort((a, b) => (b.percentage || 0) - (a.percentage || 0))[0];

      return {
        ...pdf,
        stats: {
          attemptCount: pdfAttempts.length,
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
    const originalPdf = await this.prisma.pdf.findUnique({ where: { id: pdfId } });
    if (!originalPdf) throw new NotFoundException('PDF not found');

    // Create a new PDF record pointing to the same content/storage
    const newPdf = await this.prisma.pdf.create({
      data: {
        filename: newTitle || `${originalPdf.filename} (Copy)`,
        content: originalPdf.content,
        gcsPath: originalPdf.gcsPath,
        userId: userId,
      },
    });

    return newPdf;
  }

  async deletePdf(pdfId: string) {
    const pdf = await this.prisma.pdf.findUnique({ where: { id: pdfId } });
    if (!pdf) throw new NotFoundException('PDF not found');

    // Delete in correct order due to foreign key constraints
    // 1. Delete user answers (linked to test attempts)
    await this.prisma.userAnswer.deleteMany({
      where: {
        attempt: {
          pdfId,
        },
      },
    });

    // 2. Delete test attempts
    await this.prisma.testAttempt.deleteMany({
      where: { pdfId },
    });

    // 3. Delete MCQs (linked to objectives)
    await this.prisma.mcq.deleteMany({
      where: {
        objective: {
          pdfId,
        },
      },
    });

    // 4. Delete objectives
    await this.prisma.objective.deleteMany({
      where: { pdfId },
    });

    // 5. Delete PDF sessions
    await this.prisma.pdfSession.deleteMany({
      where: { pdfId },
    });

    // 6. Finally delete the PDF itself
    await this.prisma.pdf.delete({
      where: { id: pdfId },
    });

    return {
      message: 'PDF and all associated data deleted successfully',
      pdfId,
      filename: pdf.filename,
    };
  }

  async chatPlan(message: string, pdfId: string, userId: string, history?: any[]) {
    // Get PDF info
    const pdf = await this.prisma.pdf.findUnique({ where: { id: pdfId } });
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

    // Check if ADK is available, otherwise use direct Gemini
    let useADK = false;
    try {
      const { InMemoryRunner } = require('@google/adk');
      const runner = new InMemoryRunner();
      useADK = true;
      console.log('[Chat Service] ✅ ADK available - using ADK agent');
    } catch (adkImportError) {
      console.log('[Chat Service] ❌ ADK not available - using direct Gemini fallback');
      useADK = false;
    }

    let response = '';

    if (useADK) {
      try {
        const { createTestPlanChatAgent } = require('../ai/agents');
        const { InMemoryRunner } = require('@google/adk');

        const agent = createTestPlanChatAgent(pdfContent);
        const runner = new InMemoryRunner();

        const conversationHistory = history || [];
        let conversationContext = '';
        if (conversationHistory.length > 0) {
          conversationContext = '\n\nPrevious conversation:\n' + conversationHistory.map((msg) => `${msg.role}: ${msg.content}`).join('\n');
        }

        const fullMessage = `${conversationContext}\n\nStudent's message: ${message}`;
        const result = await runner.run(agent, fullMessage);
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
    const pdf = await this.prisma.pdf.findUnique({ where: { id: pdfId } });
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
    const { InMemoryRunner } = require('@google/adk');

    const agent = createTestPlanChatAgent(pdfContent);
    const runner = new InMemoryRunner();

    const autoGenPrompt = `Based on the PDF content, automatically generate a comprehensive test plan. Create a balanced mix of easy, medium, and hard questions covering the main topics. Respond with a complete test plan in JSON format.`;

    const result = await runner.run(agent, autoGenPrompt);
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
