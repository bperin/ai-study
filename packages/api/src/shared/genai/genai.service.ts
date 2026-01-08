import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { GEMINI_MODEL } from './constants';

import {
  INTENT_QUESTION_GENERATOR_INSTRUCTION,
  LEARNING_INTENT_ANALYSIS_INSTRUCTION,
  LEARNING_INTENT_BUILDER_INSTRUCTION,
  QUESTION_ARTIFACT_EVAL_INSTRUCTION,
  SUBJECT_MATTER_EXPERT_QUESTION_INSTRUCTION,
  TEST_ASSISTANCE_HINT_INSTRUCTION,
} from './prompts';

import {
  IntentQuestionsJsonSchema,
  IntentQuestionsSchema,
  LearningIntentAnalysisJsonSchema,
  LearningIntentAnalysisSchema,
  LearningIntentJsonSchema,
  LearningIntentSchema,
  QuestionArtifactEvalJsonSchema,
  QuestionArtifactEvalSchema,
  QuestionArtifactJsonSchema,
  QuestionArtifactSchema
} from './schemas';

export interface GenerateOptions {
  model?: string;
  systemInstruction?: string;
  contents: string | any[];
  fileUri?: string; // For inline PDF context
  fileSearchStoreName?: string; // For RAG via File Search
  responseJsonSchema?: any;
}

@Injectable()
export class GenAiService {
  private readonly logger = new Logger(GenAiService.name);
  private readonly modelName: string;
  private readonly apiKey: string;
  private readonly client: GoogleGenAI;

  constructor(private readonly configService: ConfigService) {
    this.modelName = this.configService.get<string>('GEMINI_MODEL') || GEMINI_MODEL;
    this.apiKey = this.configService.get<string>('GOOGLE_API_KEY');

    if (!this.apiKey) {
      this.logger.warn('GOOGLE_API_KEY not set. Gemini API calls will fail.');
    }

    this.client = new GoogleGenAI({ apiKey: this.apiKey });
    this.logger.log(`Gemini configured with model ${this.modelName}`);
  }

  /**
   * Internal implementation of generation
   */
  private async generateContent(options: GenerateOptions): Promise<{ text: string }> {
    const modelId = options.model || this.modelName;
    const geminiTools: any[] = [];
    
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

    if (options.fileUri) {
      parts.push({
        fileData: {
          fileUri: options.fileUri,
          mimeType: 'application/pdf',
        },
      });
    }
    
    contents.push({ role: 'user', parts });

    const systemInstruction = options.systemInstruction ? { parts: [{ text: options.systemInstruction }] } : undefined;

    // Initial generation
    const response = await this.client.models.generateContent({
      model: modelId,
      contents,
      config: {
        systemInstruction,
        tools: geminiTools.length > 0 ? geminiTools : undefined,
        responseJsonSchema: options.responseJsonSchema,
      }
    });

    const finalText = response.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
    return { text: finalText };
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
    const isStoreName = fileUri && fileUri.startsWith('projects/');

    return this.generateContent({
      model: this.modelName,
      systemInstruction: TEST_ASSISTANCE_HINT_INSTRUCTION(question, options),
      contents: userPrompt,
      fileUri: !isStoreName ? fileUri : undefined,
      fileSearchStoreName: isStoreName ? fileUri : undefined,
    });
  }

  async analyzeDocumentForLearningIntents(params: { fileSearchStoreName: string; documentTitle?: string; userPrompt?: string }) {
    const prompt = params.userPrompt || `Analyze the document to identify learning intents and key themes.`;

    const response = await this.generateContent({
      model: GEMINI_MODEL,
      systemInstruction: LEARNING_INTENT_ANALYSIS_INSTRUCTION(params.documentTitle),
      contents: prompt,
      fileSearchStoreName: params.fileSearchStoreName,
      responseJsonSchema: LearningIntentAnalysisJsonSchema,
    });

    let data = null;
    try {
      data = LearningIntentAnalysisSchema.parse(JSON.parse(response.text));
    } catch (error) {
      this.logger.warn('Failed to parse learning intent analysis JSON response.');
    }

    return { ...response, data };
  }

  async buildLearningIntents(params: { analysis: string; documentTitle?: string }) {
    const response = await this.generateContent({
      model: GEMINI_MODEL,
      systemInstruction: LEARNING_INTENT_BUILDER_INSTRUCTION(params.documentTitle),
      contents: params.analysis,
      responseJsonSchema: LearningIntentJsonSchema,
    });

    let data = null;
    try {
      data = LearningIntentSchema.parse(JSON.parse(response.text));
    } catch (error) {
      this.logger.warn('Failed to parse learning intents JSON response.');
    }

    return { ...response, data };
  }

  async generateIntentQuestionArtifact(params: {
    fileSearchStoreName: string;
    intentTitle: string;
    intentDescription: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    questionCount?: number;
  }) {
    const request = `Intent: ${params.intentTitle}\nDescription: ${params.intentDescription}\nDifficulty: ${params.difficulty || 'medium'}\nQuestion count: ${params.questionCount || 5}`;

    const response = await this.generateContent({
      model: GEMINI_MODEL,
      systemInstruction: INTENT_QUESTION_GENERATOR_INSTRUCTION,
      contents: request,
      fileSearchStoreName: params.fileSearchStoreName,
      responseJsonSchema: QuestionArtifactJsonSchema,
    });

    let data = null;
    try {
      data = QuestionArtifactSchema.parse(JSON.parse(response.text));
    } catch (error) {
      this.logger.warn('Failed to parse question artifact JSON response.');
    }

    return { ...response, data };
  }

  async evaluateQuestionArtifact(params: { artifactJson: string; fileSearchStoreName: string }) {
    const response = await this.generateContent({
      model: GEMINI_MODEL,
      systemInstruction: QUESTION_ARTIFACT_EVAL_INSTRUCTION,
      contents: `Evaluate this question artifact JSON for accuracy and grounding:\n${params.artifactJson}`,
      fileSearchStoreName: params.fileSearchStoreName,
      responseJsonSchema: QuestionArtifactEvalJsonSchema,
    });

    let data = null;
    try {
      data = QuestionArtifactEvalSchema.parse(JSON.parse(response.text));
    } catch (error) {
      this.logger.warn('Failed to parse question artifact evaluation JSON response.');
    }

    return { ...response, data };
  }

  async generateIntentQuestions(params: {
    fileSearchStoreName: string;
    intentTitle: string;
    intentDescription: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    questionCount?: number;
  }) {
    const request = `Intent: ${params.intentTitle}\nDescription: ${params.intentDescription}\nDifficulty: ${params.difficulty || 'medium'}\nQuestion count: ${params.questionCount || 5}`;

    const response = await this.generateContent({
      model: GEMINI_MODEL,
      systemInstruction: INTENT_QUESTION_GENERATOR_INSTRUCTION,
      contents: request,
      fileSearchStoreName: params.fileSearchStoreName,
      responseJsonSchema: IntentQuestionsJsonSchema,
    });

    let data = null;
    try {
      data = IntentQuestionsSchema.parse(JSON.parse(response.text));
    } catch (error) {
      this.logger.warn('Failed to parse intent questions JSON response.');
    }

    return { ...response, data };
  }

  async generateSubjectMatterExpertQuestions(params: {
    userPrompt: string;
    fileSearchStoreName: string;
    focusArea?: string;
  }) {
    const request = `${params.userPrompt}${params.focusArea ? `\nFocus area: ${params.focusArea}` : ''}`;

    const response = await this.generateContent({
      model: GEMINI_MODEL,
      systemInstruction: SUBJECT_MATTER_EXPERT_QUESTION_INSTRUCTION,
      contents: request,
      fileSearchStoreName: params.fileSearchStoreName,
      responseJsonSchema: IntentQuestionsJsonSchema,
    });

    let data = null;
    try {
      data = IntentQuestionsSchema.parse(JSON.parse(response.text));
    } catch (error) {
      this.logger.warn('Failed to parse subject matter expert questions JSON response.');
    }

    return { ...response, data };
  }
}
