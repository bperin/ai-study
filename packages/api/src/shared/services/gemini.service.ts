import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InMemoryRunner, getFunctionCalls } from '@google/adk';
import { GcsService } from '../../pdfs/gcs.service';
import { PdfTextService } from './pdf-text.service';
import { createSaveObjectiveTool, createGetPdfInfoTool, createCompletionTool } from '../../ai/tools';
import { createFlashcardOrchestratorAgent } from '../../ai/agents';
import { TestsRepository } from '../../tests/tests.repository';

@Injectable()
export class GeminiService {
  constructor(
    private readonly configService: ConfigService,
    private readonly testsRepository: TestsRepository,
    private readonly gcsService: GcsService,
    private readonly pdfTextService: PdfTextService,
  ) {
    const apiKey = this.configService.get<string>('GOOGLE_API_KEY');
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY is not set in environment variables');
    }

    // Set API key as environment variable for ADK
    process.env.GOOGLE_GENAI_API_KEY = apiKey;
  }

  /**
   * Generate flashcards using an agentic approach with tools
   */
  async generateFlashcards(userPrompt: string, pdfId: string, pdfFilename: string, gcsPath: string): Promise<{ objectivesCount: number; questionsCount: number; summary: string }> {
    // Create tools for this specific PDF - now with PdfTextService
    const tools = [createSaveObjectiveTool(this.testsRepository, pdfId), createGetPdfInfoTool(pdfFilename, gcsPath, this.gcsService, this.pdfTextService), createCompletionTool()];

    // Create the root orchestrator agent
    const orchestratorAgent = createFlashcardOrchestratorAgent(tools);

    // Create runner
    const runner = new InMemoryRunner({
      agent: orchestratorAgent,
      appName: 'flashcard-generator',
    });

    // Track completion data
    let completionData: any = null;
    let objectivesCreated = 0;

    const sessionId = `pdf-${pdfId}-${Date.now()}`;
    const userId = 'system';

    // Create the session first (matching Python ADK pattern)
    const session = await runner.sessionService.createSession({
      appName: 'flashcard-generator',
      userId,
      sessionId,
      state: {
        pdfId,
        pdfFilename,
        gcsPath,
        userPrompt,
      },
    });

    // Run the agent with the user's request
    for await (const event of runner.runAsync({
      userId,
      sessionId: session.id,
      newMessage: {
        role: 'user',
        parts: [{ text: userPrompt }],
      },
    })) {
      // Check for function calls in this event
      const functionCalls = getFunctionCalls(event);

      for (const call of functionCalls) {
        console.log(`Agent called function: ${call.name}`);

        if (call.name === 'save_objective') {
          objectivesCreated++;
        }

        if (call.name === 'complete_generation') {
          completionData = call.args;
        }
      }
    }

    // Return the completion data or defaults
    return {
      objectivesCount: completionData?.totalObjectives || objectivesCreated,
      questionsCount: completionData?.totalQuestions || 0,
      summary: completionData?.summary || 'Flashcards generated successfully',
    };
  }
}
