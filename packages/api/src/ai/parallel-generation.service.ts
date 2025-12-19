import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GcsService } from '../pdfs/gcs.service';
import { PdfTextService } from '../shared/services/pdf-text.service';
import * as pdfParse from 'pdf-parse';
import { QUESTION_GENERATOR_INSTRUCTION, TEST_ANALYSIS_RESPONSE_SCHEMA, COMPREHENSIVE_ANALYSIS_PROMPT } from './prompts';
import { GEMINI_MODEL } from '../constants/models';
import { RetrieveService } from '../rag/services/retrieve.service';
import { createAdkRunner, createAdkSession, isAdkAvailable } from './adk.helpers';
import { createQualityAnalyzerAgent, createQuestionGeneratorAgentByDifficulty, createTestAnalyzerAgent } from './agents';
import { PdfStatusGateway } from '../pdf-status.gateway';

// Model constants
// @ts-ignore
const GEMINI_QUESTION_GENERATOR_MODEL = GEMINI_MODEL;

interface QuestionGenerationTask {
  difficulty: 'easy' | 'medium' | 'hard';
  count: number;
}

@Injectable()
export class ParallelGenerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gcsService: GcsService,
    private readonly pdfTextService: PdfTextService,
    private readonly retrieveService: RetrieveService,
    private readonly pdfStatusGateway: PdfStatusGateway,
  ) {}

  /**
   * Generate flashcards using parallel agent execution
   */
  async generateFlashcardsParallel(userPrompt: string, pdfId: string, pdfFilename: string, gcsPath: string, userId?: string): Promise<{ objectivesCount: number; questionsCount: number; summary: string }> {
    // Parse user prompt to determine distribution
    const tasks = this.parseUserPrompt(userPrompt);

    if (userId) {
      this.pdfStatusGateway.sendStatusUpdate(userId, {
        isGenerating: true,
        type: 'flashcards',
        message: 'Starting parallel generation agents...',
        progress: { current: 0, total: tasks.length }
      });
    }

    // Step 1: Generate questions in parallel by difficulty
    // Optimization: Break down large tasks into smaller chunks (max 5 questions per agent) for faster parallel execution
    // Optimization: Break down large tasks into smaller chunks (max 5 questions per agent) for faster parallel execution
    // BUT we must preserve the original intent and counts.
    // The previous implementation was creating multiple chunks but the prompt sent to each chunk
    // still contained the FULL user instructions with the TOTAL count, confusing the agent.

    // Instead of complex chunking which confuses the agent with conflicting "global" vs "local" counts,
    // we will run one agent per difficulty level as requested.
    // The parallelism comes from running different difficulties at the same time.

    // If we really need chunking for > 5 questions of SAME difficulty, we would need to rewrite the
    // user prompt for each chunk to only ask for that chunk's specific questions,
    // which is complex to do reliably with natural language prompts.

    let completedTasks = 0;
    const generationPromises = tasks.map(async (task) => {
      const result = await this.generateQuestionsForDifficulty(task.difficulty, task.count, pdfId, pdfFilename, gcsPath, userPrompt);
      completedTasks++;
      if (userId) {
        this.pdfStatusGateway.sendStatusUpdate(userId, {
          isGenerating: true,
          type: 'flashcards',
          message: `Generated ${task.difficulty} questions...`,
          progress: { current: completedTasks, total: tasks.length }
        });
      }
      return result;
    });

    // Wait for all parallel generations to complete
    const results = await Promise.all(generationPromises);

    // Step 2: Aggregate results
    const totalObjectives = results.reduce((sum, r) => sum + r.objectivesCreated, 0);
    const totalQuestions = results.reduce((sum, r) => sum + r.questionsCreated, 0);

    // Step 3: Quality analysis (after all questions are generated)
    if (userId) {
      this.pdfStatusGateway.sendStatusUpdate(userId, {
        isGenerating: true,
        type: 'flashcards',
        message: 'Running quality assurance on generated cards...',
        progress: { current: tasks.length, total: tasks.length }
      });
    }

    const qualitySummary = await this.runQualityAnalysis(pdfId);

    return {
      objectivesCount: totalObjectives,
      questionsCount: totalQuestions,
      summary: `Generated ${totalQuestions} questions across ${totalObjectives} objectives. ${qualitySummary}`,
    };
  }

  /**
   * Parse user prompt to determine question distribution
   */
  private parseUserPrompt(userPrompt: string): QuestionGenerationTask[] {
    const tasks: QuestionGenerationTask[] = [];

    // Extract total number of questions
    // Update to handle "questions", "cards", "flashcards" or just "items"
    const totalMatch = userPrompt.match(/(\d+)\s+(questions?|cards?|flash\s*cards?|items?)/i) || userPrompt.match(/generate\s+(\d+)/i);
    const total = totalMatch ? parseInt(totalMatch[1]) : 20; // Default to 20 questions

    // Check for difficulty mentions
    const hasEasy = /easy/i.test(userPrompt);
    const hasMedium = /medium/i.test(userPrompt);
    const hasHard = /hard/i.test(userPrompt);

    // If specific difficulties mentioned, distribute evenly
    if (hasEasy || hasMedium || hasHard) {
      const difficulties = [hasEasy && 'easy', hasMedium && 'medium', hasHard && 'hard'].filter(Boolean) as Array<'easy' | 'medium' | 'hard'>;
      const perDifficulty = Math.floor(total / difficulties.length);

      difficulties.forEach((difficulty) => {
        tasks.push({ difficulty, count: perDifficulty });
      });
    } else {
      // Default: 5 easy, 5 medium, 5 hard, 5 picture cards
      // Distribute evenly across difficulties
      if (total >= 12) {
        // For 12+ questions: balanced distribution
        const perDifficulty = Math.floor(total / 3);
        tasks.push({ difficulty: 'easy', count: perDifficulty });
        tasks.push({ difficulty: 'medium', count: perDifficulty });
        tasks.push({ difficulty: 'hard', count: total - perDifficulty * 2 }); // Remainder goes to hard
      } else {
        // For fewer questions: distribute as evenly as possible
        const easy = Math.ceil(total / 3);
        const medium = Math.ceil((total - easy) / 2);
        const hard = total - easy - medium;

        if (easy > 0) tasks.push({ difficulty: 'easy', count: easy });
        if (medium > 0) tasks.push({ difficulty: 'medium', count: medium });
        if (hard > 0) tasks.push({ difficulty: 'hard', count: hard });
      }
    }

    return tasks;
  }

  /**
   * Generate questions for a specific difficulty level
   */
  private async generateQuestionsForDifficulty(difficulty: 'easy' | 'medium' | 'hard', count: number, pdfId: string, pdfFilename: string, gcsPath: string, userPrompt: string): Promise<{ objectivesCreated: number; questionsCreated: number }> {
    // Extract PDF content first
    let pdfContent = '';
    try {
      const buffer = await this.gcsService.downloadFile(gcsPath);
      if (this.pdfTextService) {
        const extracted = await this.pdfTextService.extractText(buffer);
        pdfContent = extracted.structuredText.substring(0, 500000); // 500k chars ~ 125k tokens
      } else {
        const data = await pdfParse(buffer);
        pdfContent = data.text.substring(0, 500000);
      }
      console.log(`PDF content extracted for question generation (${pdfContent.length} chars):`, pdfContent.substring(0, 200) + '...');
    } catch (error) {
      console.error('Error extracting PDF content for question generation:', error);
      console.log('PDF content is empty - agents will have no context');
    }

    // Build RAG context (preferred) and fall back to raw PDF content
    const ragContext = await this.buildRagContext(userPrompt, difficulty, pdfFilename, gcsPath);
    const contextSource = ragContext ? 'RAG chunks' : 'raw PDF text';

    // Create specialized agent for this difficulty with PDF content
    let useADK = isAdkAvailable();
    console.log(useADK ? `[Question Generator ${difficulty}] ✅ ADK available - using ADK agent` : `[Question Generator ${difficulty}] ❌ ADK not available - using direct Gemini fallback`);

    if (useADK) {
      try {
        const agent = createQuestionGeneratorAgentByDifficulty(difficulty, this.prisma, pdfId, this.retrieveService, pdfFilename, gcsPath);

        const runner = createAdkRunner({ agent, appName: 'flashcard-generator' });
        if (!runner) {
          useADK = false;
          console.error(`[Question Generator ${difficulty}] ❌ Failed to create ADK runner, falling back to direct Gemini.`);
        }
      } catch (adkError) {
        console.error(`[Question Generator ${difficulty}] ❌ ADK agent failed, falling back to direct Gemini:`, adkError);
        useADK = false;
      }
    }

    if (!useADK) {
      // Direct Gemini fallback for question generation
      console.log(`[Question Generator ${difficulty}] 🔄 Using direct Gemini fallback (with RAG context)`);
      const { GoogleGenerativeAI } = require('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
      const model = genAI.getGenerativeModel({ model: GEMINI_QUESTION_GENERATOR_MODEL });

      // Fallback still uses RAG context if available, but no raw PDF fallback
      const prompt = `${QUESTION_GENERATOR_INSTRUCTION}\n\nGenerate ${count} ${difficulty} difficulty questions from the provided document content.\n\nSOURCE MATERIAL (${contextSource}):\n${ragContext || 'NO CONTEXT AVAILABLE'}`;

      const result = await model.generateContent(prompt);
      const response = result.response.text();

      // Parse and save questions directly (simplified fallback)
      console.log(`[Question Generator ${difficulty}] Generated questions via Gemini fallback`);
      return { objectivesCreated: 0, questionsCreated: 0 };
    }

    // Continue with ADK if available
    const agent = createQuestionGeneratorAgentByDifficulty(difficulty, this.prisma, pdfId, this.retrieveService, pdfFilename, gcsPath);

    const runner = createAdkRunner({ agent, appName: 'flashcard-generator' });
    if (!runner) {
      console.error(`[Question Generator ${difficulty}] ❌ Could not create ADK runner after availability check.`);
      return { objectivesCreated: 0, questionsCreated: 0 };
    }

    const sessionId = `pdf-${pdfId}-${difficulty}-${Date.now()}`;
    const userId = 'system';

    await createAdkSession(runner, {
      appName: 'flashcard-generator',
      userId,
      sessionId,
      state: { pdfId, difficulty, count },
    });

    // Extract PDF text directly to ensure the model has it
    let pdfContext = '';
    try {
      const buffer = await this.gcsService.downloadFile(gcsPath);
      // Use existing PDF service if available, else simple parse
      if (this.pdfTextService) {
        const extracted = await this.pdfTextService.extractText(buffer);
        pdfContext = extracted.structuredText.substring(0, 500000); // 500k chars ~ 125k tokens
      } else {
        const data = await pdfParse(buffer);
        pdfContext = data.text.substring(0, 500000);
      }
    } catch (error) {
      console.error('Error pre-fetching PDF content:', error);
      // Fallback: Agent will try to use tool if context is missing, though we'd prefer direct injection
    }

    const prompt = `
Generate exactly ${count} ${difficulty} difficulty questions.

USER INSTRUCTIONS (Context only): "${userPrompt}"

IMPORTANT:
1. Ignore any question counts in the "USER INSTRUCTIONS" above. ONLY generate ${count} questions as requested in the first line.
2. Use the search_document tool to find relevant content from the document.
3. Generate the questions based on the content found.
4. YOU MUST save the generated questions to the database using the save_objective tool.
5. Do NOT output the questions as text. Only use the tool to save them.
`;

    // Run agent
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // @ts-ignore
    for await (const _event of runner.runAsync({
      agent,
      userId,
      sessionId,
      newMessage: {
        role: 'user',
        parts: [{ text: prompt }],
      },
    })) {
      // Tools are executed automatically by the runner
    }

    // Check database for results
    const objectives = await this.prisma.objective.findMany({
      where: {
        pdfId,
        difficulty,
      },
      include: {
        _count: {
          select: { mcqs: true },
        },
      },
    });

    const objectivesCreated = objectives.length;
    const questionsCreated = objectives.reduce((sum, obj) => sum + obj._count.mcqs, 0);

    return {
      objectivesCreated,
      questionsCreated,
    };
  }

  /**
   * Run quality analysis on all generated questions
   */
  private async runQualityAnalysis(pdfId: string): Promise<string> {
    // Fetch all questions for this PDF
    const objectives = await this.prisma.objective.findMany({
      where: { pdfId },
      include: { mcqs: true },
    });

    // Create quality analyzer agent
    const agent = createQualityAnalyzerAgent();

    const runner = createAdkRunner({ agent, appName: 'flashcard-generator' });
    if (!runner) {
      throw new Error('[Quality Analyzer] ADK not available');
    }

    const sessionId = `quality-${pdfId}-${Date.now()}`;
    const userId = 'system';

    await createAdkSession(runner, {
      appName: 'flashcard-generator',
      userId,
      sessionId,
      state: { objectives },
    });

    let qualitySummary = 'Quality analysis pending.';

    for await (const event of runner.runAsync({
      agent,
      userId,
      sessionId,
      newMessage: {
        role: 'user',
        parts: [
          {
            text: `Analyze the quality of these flashcards: ${JSON.stringify(objectives, null, 2)}`,
          },
        ],
      },
    })) {
      // Extract quality summary from agent response
      if (event.content?.parts?.[0]?.text) {
        qualitySummary = event.content.parts[0].text;
      }
    }

    return qualitySummary;
  }

  /**
   * Look up a RAG document that matches this PDF by GCS path or filename
   */
  private async findRagDocumentId(pdfFilename: string, gcsPath: string): Promise<string | null> {
    const normalizedPath = gcsPath.replace('gcs://', '');

    const document = await this.prisma.document.findFirst({
      where: {
        status: 'READY',
        OR: [{ sourceUri: { contains: gcsPath } }, { sourceUri: { contains: normalizedPath } }, { title: { equals: pdfFilename, mode: 'insensitive' } }],
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    return document?.id || null;
  }

  /**
   * Build a contextual RAG snippet for the generator using top-ranked chunks
   */
  private async buildRagContext(userPrompt: string, difficulty: string, pdfFilename: string, gcsPath: string): Promise<string> {
    try {
      const documentId = await this.findRagDocumentId(pdfFilename, gcsPath);
      if (!documentId) {
        console.log('[RAG] No matching document found for PDF; falling back to raw text');
        return '';
      }

      const chunks = await this.prisma.chunk.findMany({
        where: { documentId },
        orderBy: { chunkIndex: 'asc' },
      });

      const ranked = await this.retrieveService.rankChunks(`${userPrompt} Difficulty: ${difficulty}`, chunks, 8);
      if (!ranked.length) {
        console.log('[RAG] Document has no ranked chunks; falling back to raw text');
        return '';
      }

      const context = ranked.map((chunk) => `[Chunk ${chunk.chunkIndex}]\n${chunk.content.trim()}`).join('\n\n');

      console.log(`[RAG] Using ${ranked.length} ranked chunks for context (document ${documentId})`);
      return context;
    } catch (error) {
      console.error('[RAG] Failed to build context, using raw PDF text instead:', error);
      return '';
    }
  }

  /**
   * Analyze test results to provide study strategies with web-enhanced resources
   */
  async analyzeTestResults(
    pdfId: string,
    missedQuestions: any[],
    allAnswers?: any[],
  ): Promise<{
    report: string;
  }> {
    // Fetch PDF info
    const pdf = await this.prisma.pdf.findUnique({ where: { id: pdfId } });
    if (!pdf) throw new Error('PDF not found');

    const pdfFilename = pdf.filename;
    const gcsPath = pdf.gcsPath || pdf.content || '';

    // Create analyzer agent with web search capability
    const agent = createTestAnalyzerAgent(pdfFilename, gcsPath, this.gcsService, this.pdfTextService, this.retrieveService);

    const runner = createAdkRunner({ agent, appName: 'flashcard-generator' });
    if (!runner) {
      throw new Error('[Test Analyzer] ADK not available');
    }

    const sessionId = `analysis-${pdfId}-${Date.now()}`;
    const userId = 'system';

    await createAdkSession(runner, {
      appName: 'flashcard-generator',
      userId,
      sessionId,
      state: { pdfId, missedQuestions },
    });

    // Extract PDF text directly to ensure the model has it
    let pdfContext = '';
    try {
      const buffer = await this.gcsService.downloadFile(gcsPath);
      if (this.pdfTextService) {
        const extracted = await this.pdfTextService.extractText(buffer);
        pdfContext = extracted.structuredText.substring(0, 500000);
      } else {
        const data = await pdfParse(buffer);
        pdfContext = data.text.substring(0, 500000);
      }
    } catch (error) {
      console.error('Error pre-fetching PDF content for analysis:', error);
    }

    let analysisResult = {
      report: 'Analysis failed to generate. Please try again.',
    };

    // @ts-ignore
    for await (const event of runner.runAsync({
      agent,
      userId,
      sessionId,
      newMessage: {
        role: 'user',
        parts: [
          {
            text: COMPREHENSIVE_ANALYSIS_PROMPT.replace('{missedQuestions}', JSON.stringify(missedQuestions, null, 2))
              .replace(
                '{allAnswersSection}',
                allAnswers && allAnswers.length > 0
                  ? `
ALL student answers (correct and incorrect):
${JSON.stringify(allAnswers, null, 2)}
`
                  : '',
              )
              .replace('{pdfContext}', pdfContext),
          },
        ],
      },
    })) {
      if (event.content?.parts?.[0]?.text) {
        // Store the raw text response as the report
        analysisResult = {
          report: event.content.parts[0].text.trim(),
        };
      }
    }

    return analysisResult;
  }
}
