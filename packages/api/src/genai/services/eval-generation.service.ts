import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { ArtifactsService } from '../../domain/artifacts/artifacts.service';
import { ArtifactType, ArtifactStatus } from '@prisma/client';
import { EVAL_GENERATION_INSTRUCTION } from '../../shared/genai/prompts';

@Injectable()
export class EvalGenerationService {
  private readonly logger = new Logger(EvalGenerationService.name);
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
   * Generate a complete evaluation with items based on document content, intents, and plan
   */
  async generateEvaluation(params: {
    evalId: string;
    documentId: string;
    userId: string;
    plan: any;
  }): Promise<any> {
    const { evalId, documentId, userId, plan } = params;

    // Create a pending artifact to track the evaluation generation
    const artifact = await this.artifactsService.createArtifact({
      type: ArtifactType.EVAL,
      status: ArtifactStatus.GENERATING,
      documentId,
      evalId,
      userId,
      meta: { 
        planId: plan.id,
        startTime: new Date().toISOString(),
      },
    });

    try {
      // Start timing
      const startTime = Date.now();

      // Get the document intents
      const intents = await this.artifactsService.getDocumentIntents(documentId);
      if (!intents) {
        throw new Error('No intents found for this document');
      }

      // Generate the evaluation using Gemini
      const { evaluation, metrics } = await this.generateEvalContent(intents, plan);

      // Calculate latency
      const latencyMs = Date.now() - startTime;

      // Update metrics
      const updatedMetrics = {
        ...metrics,
        latencyMs,
        endTime: new Date().toISOString(),
      };

      // Update the artifact with the generated evaluation and metrics
      await this.artifactsService.updateArtifact(artifact.id, {
        status: ArtifactStatus.READY,
        json: evaluation,
        meta: {
          ...artifact.meta,
          ...updatedMetrics,
        },
      });

      // For each item in the evaluation, create an EVAL_ITEM artifact
      if (evaluation.items && Array.isArray(evaluation.items)) {
        for (let i = 0; i < evaluation.items.length; i++) {
          const item = evaluation.items[i];
          
          // Create an artifact for the item
          await this.artifactsService.createArtifact({
            type: ArtifactType.EVAL_ITEM,
            status: ArtifactStatus.READY,
            documentId,
            evalId,
            userId,
            json: item,
            meta: {
              itemIndex: i,
              generatedAt: new Date().toISOString(),
              model: metrics.model,
            },
          });

          // If the item has an image prompt, create an IMAGE artifact
          if (item.hasImage && item.imagePrompt) {
            await this.artifactsService.createArtifact({
              type: ArtifactType.IMAGE,
              status: ArtifactStatus.PENDING, // Will be processed separately
              documentId,
              evalId,
              userId,
              text: item.imagePrompt,
              meta: {
                itemIndex: i,
                requestedAt: new Date().toISOString(),
              },
            });
          }
        }
      }

      return evaluation;
    } catch (error) {
      this.logger.error(`Failed to generate evaluation for eval ${evalId}: ${error.message}`);
      
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
   * Generate evaluation content using Gemini
   */
  private async generateEvalContent(
    intents: any,
    plan: any,
  ): Promise<{ evaluation: any, metrics: any }> {
    const model = this.genAI.getGenerativeModel({ model: this.MODEL_NAME });

    // Format the intents and plan for the prompt
    const intentsJson = JSON.stringify(intents, null, 2);
    const planJson = JSON.stringify(plan, null, 2);

    const prompt = `
    ${EVAL_GENERATION_INSTRUCTION}
    
    DOCUMENT INTENTS:
    ${intentsJson}
    
    EVALUATION PLAN:
    ${planJson}
    `;

    // Track token usage
    let inputTokenCount = 0;
    let outputTokenCount = 0;

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

    try {
      const evaluation = JSON.parse(jsonMatch[0]);
      
      return {
        evaluation,
        metrics: {
          model: this.MODEL_NAME,
          inputTokens: inputTokenCount,
          outputTokens: outputTokenCount,
        }
      };
    } catch (error) {
      throw new Error(`Failed to parse JSON from Gemini response: ${error.message}`);
    }
  }
}
