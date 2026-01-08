import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ArtifactsService } from '../../domain/artifacts/artifacts.service';
import { ArtifactType, ArtifactStatus } from '@prisma/client';
import { GoogleGenAI } from '@google/genai';
import { LEARNING_INTENT_ANALYSIS_INSTRUCTION, LEARNING_INTENT_BUILDER_INSTRUCTION } from '../../shared/genai/prompts';

@Injectable()
export class DocumentIntentService {
  private readonly logger = new Logger(DocumentIntentService.name);
  private readonly genAI: GoogleGenAI;
  private readonly MODEL_NAME = 'gemini-3-flash-preview';

  constructor(
    private readonly configService: ConfigService,
    private readonly artifactsService: ArtifactsService,
  ) {
    const apiKey = this.configService.get<string>('google.apiKey');
    this.genAI = new GoogleGenAI({ apiKey });
  }

  /**
   * Extract learning intents from a document
   * This is the first step in the document processing pipeline
   */
  async extractDocumentIntents(params: {
    documentId: string;
    documentTitle: string;
    userId: string;
    fileSearchStoreName?: string;
  }): Promise<any> {
    const { documentId, documentTitle, userId, fileSearchStoreName } = params;

    // Create a pending artifact to track the intent extraction
    const artifact = await this.artifactsService.createArtifact({
      type: ArtifactType.INTENTS,
      status: ArtifactStatus.GENERATING,
      documentId,
      userId,
      meta: { 
        title: documentTitle,
        fileSearchStoreName,
        startTime: new Date().toISOString(),
      },
    });

    try {
      // Start timing
      const startTime = Date.now();

      // Generate the intents using Gemini
      const { intents, metrics } = await this.generateIntents(documentTitle, fileSearchStoreName);

      // Calculate latency
      const latencyMs = Date.now() - startTime;

      // Update metrics
      const updatedMetrics = {
        ...metrics,
        latencyMs,
        endTime: new Date().toISOString(),
      };

      // Update the artifact with the generated intents and metrics
      await this.artifactsService.updateArtifact(artifact.id, {
        status: ArtifactStatus.READY,
        json: intents,
        meta: {
          ...artifact.meta,
          ...updatedMetrics,
        },
      });

      return intents;
    } catch (error) {
      this.logger.error(`Failed to extract intents for document ${documentId}: ${error.message}`);
      
      // Mark the artifact as failed
      await this.artifactsService.updateArtifact(artifact.id, {
        status: ArtifactStatus.FAILED,
        error: error.message,
        meta: {
          ...artifact.meta,
          endTime: new Date().toISOString(),
          errorDetails: error.stack,
        },
      });

      throw error;
    }
  }

  /**
   * Generate intents using Gemini
   */
  private async generateIntents(documentTitle: string, fileSearchStoreName?: string): Promise<{ intents: any, metrics: any }> {
    const model = this.genAI.getGenerativeModel({ model: this.MODEL_NAME });

    // Use the prompt from our prompts file
    const prompt = LEARNING_INTENT_ANALYSIS_INSTRUCTION(documentTitle);

    // Track token usage
    let inputTokenCount = 0;
    let outputTokenCount = 0;

    try {
      // Generate content
      const result = await model.generateContent(prompt);
      const text = result.response.text();

      // Extract token usage if available
      if (result.response.promptFeedback?.tokenCount) {
        inputTokenCount = result.response.promptFeedback.tokenCount;
      }
      
      // Estimate output tokens (rough approximation)
      outputTokenCount = Math.ceil(text.length / 4);

      // Extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Failed to extract JSON from Gemini response');
      }

      const intents = JSON.parse(jsonMatch[0]);

      // Process the raw intents through the builder to get structured intents
      const structuredIntents = await this.processIntentsWithBuilder(intents, documentTitle);

      return {
        intents: structuredIntents,
        metrics: {
          model: this.MODEL_NAME,
          inputTokens: inputTokenCount,
          outputTokens: outputTokenCount,
          fileSearchStoreName,
        }
      };
    } catch (error) {
      this.logger.error(`Intent generation error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process raw intents through the builder to get structured intents
   */
  private async processIntentsWithBuilder(rawIntents: any, documentTitle: string): Promise<any> {
    const model = this.genAI.getGenerativeModel({ model: this.MODEL_NAME });

    // Use the builder prompt
    const prompt = LEARNING_INTENT_BUILDER_INSTRUCTION(documentTitle);
    
    // Add the raw intents to the prompt
    const fullPrompt = `
    ${prompt}
    
    RAW ANALYSIS:
    ${JSON.stringify(rawIntents, null, 2)}
    
    Convert this raw analysis into structured learning intents.
    `;

    const result = await model.generateContent(fullPrompt);
    const text = result.response.text();

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from intent builder response');
    }

    try {
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      throw new Error(`Failed to parse JSON from intent builder response: ${error.message}`);
    }
  }
}
