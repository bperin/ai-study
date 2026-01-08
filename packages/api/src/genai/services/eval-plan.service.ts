import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { ArtifactsService } from '../../domain/artifacts/artifacts.service';
import { EvalSessionsService } from '../../domain/eval-sessions/eval-sessions.service';
import { ArtifactType, ArtifactStatus } from '@prisma/client';
import { EVAL_PLAN_INSTRUCTION } from '../../shared/genai/prompts';

@Injectable()
export class EvalPlanService {
  private readonly logger = new Logger(EvalPlanService.name);
  private readonly genAI: GoogleGenAI;
  private readonly MODEL_NAME = 'gemini-3-flash-preview';

  constructor(
    private readonly configService: ConfigService,
    private readonly artifactsService: ArtifactsService,
    private readonly evalSessionsService: EvalSessionsService,
  ) {
    const apiKey = this.configService.get<string>('google.apiKey');
    this.genAI = new GoogleGenAI({ apiKey });
  }

  /**
   * Generate an evaluation plan based on document intents and user preferences
   */
  async generateEvalPlan(params: { sessionId: string; documentId: string; userId: string }): Promise<any> {
    const { sessionId, documentId, userId } = params;

    // Mark the session as generating
    await this.evalSessionsService.markSessionAsGenerating(sessionId);

    // Create a pending artifact to track the plan generation
    const artifact = await this.artifactsService.createArtifact({
      type: ArtifactType.SUMMARY,
      status: ArtifactStatus.GENERATING,
      documentId,
      userId,
      meta: {
        sessionId,
        startTime: new Date().toISOString(),
      },
    });

    try {
      // Start timing
      const startTime = Date.now();

      // Get the session details
      const session = await this.evalSessionsService.getSessionById(sessionId);

      // Get the document intents
      const intents = await this.artifactsService.getDocumentIntents(documentId);
      if (!intents) {
        throw new Error('No intents found for this document');
      }

      // Generate the plan using Gemini
      const { plan, metrics } = await this.generatePlan(intents, session.userPreferences, {
        difficulty: session.difficulty,
        totalItems: session.totalItems,
        includeImages: session.includeImages,
        imageCount: session.imageCount,
        timeLimitMins: session.timeLimitMins,
      });

      // Calculate latency
      const latencyMs = Date.now() - startTime;

      // Update metrics
      const updatedMetrics = {
        ...metrics,
        latencyMs,
        endTime: new Date().toISOString(),
      };

      // Update the artifact with the generated plan and metrics
      await this.artifactsService.updateArtifact(artifact.id, {
        status: ArtifactStatus.READY,
        json: plan,
        meta: {
          ...artifact.meta,
          ...updatedMetrics,
        },
      });

      // Update the session with the proposed plan
      await this.evalSessionsService.updateSessionPlan(sessionId, plan);

      return plan;
    } catch (error) {
      this.logger.error(`Failed to generate eval plan for session ${sessionId}: ${error.message}`);

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
   * Generate a plan using Gemini
   */
  private async generatePlan(
    intents: any,
    userPreferences: any,
    constraints: {
      difficulty?: string;
      totalItems?: number;
      includeImages?: boolean;
      imageCount?: number;
      timeLimitMins?: number;
    },
  ): Promise<{ plan: any; metrics: any }> {
    const model = this.genAI.getGenerativeModel({ model: this.MODEL_NAME });

    // Format the intents and constraints for the prompt
    const intentsJson = JSON.stringify(intents, null, 2);
    const userPreferencesJson = JSON.stringify(userPreferences, null, 2);
    const constraintsJson = JSON.stringify(constraints, null, 2);

    const prompt = `
    ${EVAL_PLAN_INSTRUCTION}
    
    DOCUMENT INTENTS:
    ${intentsJson}
    
    USER PREFERENCES:
    ${userPreferencesJson}
    
    CONSTRAINTS:
    ${constraintsJson}
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
      const plan = JSON.parse(jsonMatch[0]);

      return {
        plan,
        metrics: {
          model: this.MODEL_NAME,
          inputTokens: inputTokenCount,
          outputTokens: outputTokenCount,
        },
      };
    } catch (error) {
      throw new Error(`Failed to parse JSON from Gemini response: ${error.message}`);
    }
  }
}
