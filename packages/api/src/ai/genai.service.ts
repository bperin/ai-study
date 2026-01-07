import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, Part } from '@google/genai';

import { AiTool, createCompletionTool, createGetPdfInfoTool, createSaveObjectiveTool, createWebSearchTool } from './tools';
import { TestsRepository } from '../tests/tests.repository';
import {
  CONTENT_ANALYZER_INSTRUCTION,
  QUALITY_ANALYZER_INSTRUCTION,
  QUESTION_GENERATOR_INSTRUCTION,
  ROOT_AGENT_INSTRUCTION,
  TEST_ANALYZER_INSTRUCTION
} from './prompts';
import { GEMINI_MODEL } from '../constants/models';

export interface GenerateOptions {
  model?: string;
  systemInstruction?: string;
  contents: string | any[];
  tools?: any[];
  fileUri?: string; // For inline PDF context
  fileSearchStoreName?: string; // For RAG via File Search
}

@Injectable()
export class GenAiService {
  private readonly logger = new Logger(GenAiService.name);
  private readonly modelName: string;
  private readonly apiKey: string;
  private readonly client: GoogleGenAI;

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly testsRepository?: TestsRepository,
  ) {
    this.modelName = this.configService.get<string>('GEMINI_MODEL') || GEMINI_MODEL;
    this.apiKey = this.configService.get<string>('GOOGLE_API_KEY') || '';

    if (!this.apiKey) {
      this.logger.warn('GOOGLE_API_KEY not set. Gemini API calls will fail.');
    }

    this.client = new GoogleGenAI({ apiKey: this.apiKey });
    this.logger.log(`Gemini configured with model ${this.modelName}`);
  }

  /**
   * Access to models with a simplified API
   */
  get models() {
    return {
      generateContent: async (options: GenerateOptions) => {
        return this.generateWithTools(options);
      }
    };
  }

  /**
   * Internal implementation of generation with tool support
   */
  private async generateWithTools(options: GenerateOptions): Promise<{ text: string; completionData?: any }> {
    const modelId = options.model || this.modelName;
    const tools = options.tools || [];
    
    const functionDeclarations = tools
      .filter((t: any) => t.parameters && t.execute)
      .map((t: any) => ({
        name: t.name,
        description: t.description,
        parameters: t.parameters,
      }));

    const geminiTools: any[] = [];
    if (functionDeclarations.length > 0) {
      geminiTools.push({ functionDeclarations: functionDeclarations });
    }
    
    // Add File Search tool if a store name is provided
    if (options.fileSearchStoreName) {
      geminiTools.push({
        fileSearch: {
          fileSearchStoreNames: [options.fileSearchStoreName]
        }
      });
    }

    // GoogleGenAI client (v1beta) uses a slightly different structure than Vertex AI SDK
    // Configuring the request
    const contents: any[] = [];
    const parts: any[] = [];
    
    if (typeof options.contents === 'string') {
      parts.push({ text: options.contents });
    } else {
      // Assuming options.contents is already an array of parts
      // But we need to make sure they match the expected format
      if (Array.isArray(options.contents)) {
          options.contents.forEach((c: any) => parts.push(c));
      }
    }
    
    contents.push({ role: 'user', parts });

    const systemInstruction = options.systemInstruction
      ? { parts: [{ text: options.systemInstruction }] }
      : undefined;

    // Initial generation
    let response = await this.client.models.generateContent({
      model: modelId,
      contents,
      config: {
        systemInstruction,
        tools: geminiTools.length > 0 ? geminiTools : undefined,
      }
    });

    let completionData: any = null;

    // Tool use loop
    for (let i = 0; i < 5; i++) {
      const candidates = response.candidates;
      if (!candidates || candidates.length === 0) break;
      
      const candidate = candidates[0];
      const content = candidate.content;
      
      // Check for function calls
      const functionCalls = content?.parts?.filter((p: any) => p.functionCall);
      
      if (!functionCalls || functionCalls.length === 0) {
        break;
      }
      
      // Add assistant response to history
      // Ensure we push the content correctly
      contents.push({ role: 'model', parts: content.parts });

      const toolResults: any[] = [];
      
      for (const callPart of functionCalls) {
        const functionCall = callPart.functionCall;
        const tool = tools.find((t: any) => t.name === functionCall.name);

        if (tool) {
          this.logger.debug(`[GenAi] Executing tool: ${tool.name}`);
          let result;
          try {
             result = await tool.execute(functionCall.args);
          } catch (e) {
             this.logger.error(`Error executing tool ${tool.name}: ${e}`);
             result = { error: `Error executing tool ${tool.name}: ${e}` };
          }
          
          toolResults.push({
            functionResponse: {
              name: tool.name,
              response: result,
            },
          });

          if (tool.name === 'complete_generation') {
            completionData = functionCall.args;
          }
        } else {
           // Handle unknown tool
           toolResults.push({
            functionResponse: {
              name: functionCall.name,
              response: { error: `Tool ${functionCall.name} not found` },
            },
          });
        }
      }

      // Add tool results to history
      contents.push({ role: 'user', parts: toolResults });

      // Generate next response
      response = await this.client.models.generateContent({
        model: modelId,
        contents,
        config: {
          systemInstruction,
          tools: toolsConfig.length > 0 ? toolsConfig : undefined,
        }
      });
    }

    const finalText = response.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
    return { text: finalText, completionData };
  }

  /**
   * Generate flashcards using an agentic approach
   */
  async generateFlashcards(userPrompt: string, documentId: string, pdfFilename: string, pdfContent: string): Promise<{ objectivesCount: number; questionsCount: number; summary: string }> {
    const { testsRepository } = this.getFlashcardDependencies();
    
    const tools: AiTool[] = [
      createSaveObjectiveTool(testsRepository, documentId),
      createGetPdfInfoTool(pdfFilename, pdfContent),
      createCompletionTool()
    ];

    this.logger.log(`Starting flashcard generation for document ${documentId}`);
    const { completionData } = await this.runFlashcardOrchestrator(userPrompt, tools);

    return {
      objectivesCount: completionData?.totalObjectives || 0,
      questionsCount: completionData?.totalQuestions || 0,
      summary: completionData?.summary || 'Flashcards generated successfully',
    };
  }

  /**
   * Simple answer generation
   */
  async generateAnswer(systemPrompt: string, context: string, question: string): Promise<{ text: string; model: string }> {
    const userPrompt = `Context:\n${context}\n\nQuestion: ${question}\nAnswer:`;
    const result = await this.models.generateContent({
      systemInstruction: systemPrompt,
      contents: userPrompt,
    });
    return { text: result.text, model: this.modelName };
  }

  // Helper for flashcard dependencies
  getFlashcardDependencies() {
    if (!this.testsRepository) {
      throw new Error('GenAiService flashcard dependencies missing.');
    }
    return { testsRepository: this.testsRepository };
  }

  /**
   * Performs content analysis to identify learning objectives
   */
  async runContentAnalyzer(userPrompt: string) {
    return this.models.generateContent({
      model: GEMINI_MODEL,
      systemInstruction: CONTENT_ANALYZER_INSTRUCTION,
      contents: userPrompt,
    });
  }

  /**
   * Generates high-quality multiple choice questions
   */
  async runQuestionGenerator(
    userPrompt: string,
    pdfFilename: string,
    fileUri: string | undefined,
  ) {
    // If fileUri is a Google Cloud Storage path or undefined, we treat it as an inline file
    // but if it looks like a file search store name (e.g. "projects/..."), we use the RAG tool
    const isStoreName = fileUri && fileUri.startsWith('projects/');
    
    return this.models.generateContent({
      model: GEMINI_MODEL,
      systemInstruction: QUESTION_GENERATOR_INSTRUCTION,
      contents: userPrompt,
      // Only pass fileUri if it's NOT a store name (assuming it's a GCS URI for inline processing)
      fileUri: !isStoreName ? fileUri : undefined,
      // Pass store name if it is one
      fileSearchStoreName: isStoreName ? fileUri : undefined,
      tools: [
        createGetPdfInfoTool(pdfFilename),
      ],
    });
  }

  /**
   * Reviews generated flashcards and provides a quality report
   */
  async runQualityAnalyzer(userPrompt: string) {
    return this.models.generateContent({
      model: GEMINI_MODEL,
      systemInstruction: QUALITY_ANALYZER_INSTRUCTION,
      contents: userPrompt,
    });
  }

  /**
   * Orchestrates the generation of educational flashcards
   */
  async runFlashcardOrchestrator(userPrompt: string, tools: any[]) {
    return this.models.generateContent({
      model: GEMINI_MODEL,
      systemInstruction: ROOT_AGENT_INSTRUCTION,
      contents: userPrompt,
      tools,
    });
  }

  /**
   * Generates questions by difficulty
   */
  async runQuestionGeneratorByDifficulty(
    userPrompt: string,
    difficulty: 'easy' | 'medium' | 'hard',
    testsRepository: TestsRepository,
    documentId: string,
    fileUri?: string,
  ) {
    const isStoreName = fileUri && fileUri.startsWith('projects/');

    return this.models.generateContent({
      model: GEMINI_MODEL,
      systemInstruction: QUESTION_GENERATOR_INSTRUCTION,
      contents: `Generate ${difficulty} difficulty questions based on: ${userPrompt}`,
      fileUri: !isStoreName ? fileUri : undefined,
      fileSearchStoreName: isStoreName ? fileUri : undefined,
      tools: [
        createSaveObjectiveTool(testsRepository, documentId),
        createWebSearchTool(),
      ],
    });
  }

  /**
   * Analyzes test results and suggests study strategies
   */
  async runTestAnalyzer(
    userPrompt: string,
    pdfFilename: string,
    fileUri: string | undefined,
  ) {
    const isStoreName = fileUri && fileUri.startsWith('projects/');

    return this.models.generateContent({
      model: GEMINI_MODEL,
      systemInstruction: TEST_ANALYZER_INSTRUCTION,
      contents: userPrompt,
      fileUri: !isStoreName ? fileUri : undefined,
      fileSearchStoreName: isStoreName ? fileUri : undefined,
      tools: [
        createGetPdfInfoTool(pdfFilename),
        createWebSearchTool(),
      ],
    });
  }

  /**
   * Helps students create test plans
   */
  async runTestPlanChat(
    userPrompt: string,
    pdfFilename: string,
    fileUri?: string,
  ) {
    const { TEST_PLAN_CHAT_PROMPT } = require('./prompts');
    const isStoreName = fileUri && fileUri.startsWith('projects/');

    return this.models.generateContent({
      model: GEMINI_MODEL,
      systemInstruction: TEST_PLAN_CHAT_PROMPT(pdfFilename || 'Study Guide', ''),
      contents: userPrompt,
      fileUri: !isStoreName ? fileUri : undefined,
      fileSearchStoreName: isStoreName ? fileUri : undefined,
    });
  }

  /**
   * Provides helpful hints during test taking
   */
  async runTestAssistance(
    userPrompt: string,
    question: string,
    options: string[],
    fileUri?: string,
  ) {
    const { TEST_ASSISTANCE_CHAT_PROMPT } = require('./prompts');
    const isStoreName = fileUri && fileUri.startsWith('projects/');

    return this.models.generateContent({
      model: GEMINI_MODEL,
      systemInstruction: TEST_ASSISTANCE_CHAT_PROMPT(question, options),
      contents: userPrompt,
      fileUri: !isStoreName ? fileUri : undefined,
      fileSearchStoreName: isStoreName ? fileUri : undefined,
    });
  }

  /**
   * Runs a grounded prompt against a File Search store
   */
  async runFileSearchPrompt(params: { userPrompt: string; fileSearchStoreName: string; systemInstruction?: string; model?: string }) {
    return this.models.generateContent({
      model: params.model || GEMINI_MODEL,
      systemInstruction: params.systemInstruction,
      contents: params.userPrompt,
      fileSearchStoreName: params.fileSearchStoreName,
    });
  }

  /**
   * Generates educational images
   */
  async runImageGenerator(userPrompt: string) {
    return this.models.generateContent({
      model: GEMINI_MODEL,
      systemInstruction: `You are an image generation specialist. Generate clear, educational images based on prompts for flashcard questions.`,
      contents: userPrompt,
    });
  }
}
