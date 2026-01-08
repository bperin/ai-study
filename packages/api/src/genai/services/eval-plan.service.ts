import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { ArtifactsService } from '../../domain/artifacts/artifacts.service';
import { EvalSessionsService } from '../../domain/eval-sessions/eval-sessions.service';
import { ArtifactType, ArtifactStatus } from '@prisma/client';

@Injectable()
export class EvalPlanService {
  private readonly logger = new Logger(EvalPlanService.name);
  private readonly genAI: GoogleGenAI;

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
  async generateEvalPlan(params: {
    sessionId: string;
    documentId: string;
    userId: string;
  }): Promise<any> {
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

      // Generate a fallback plan
      const fallbackPlan = this.generateFallbackPlan(documentId);
      
      // Update the session with the fallback plan
      await this.evalSessionsService.updateSessionPlan(sessionId, fallbackPlan);

      return fallbackPlan;
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
    }
  ): Promise<{ plan: any, metrics: any }> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Format the intents and constraints for the prompt
    const intentsJson = JSON.stringify(intents, null, 2);
    const userPreferencesJson = JSON.stringify(userPreferences, null, 2);
    const constraintsJson = JSON.stringify(constraints, null, 2);

    const prompt = `
    You are an educational assessment planner. Create a detailed evaluation plan based on the following:
    
    DOCUMENT INTENTS:
    ${intentsJson}
    
    USER PREFERENCES:
    ${userPreferencesJson}
    
    CONSTRAINTS:
    ${constraintsJson}
    
    Create a plan that respects both the document's learning intents and the user's preferences.
    The plan should include:
    1. A list of topics to cover
    2. Question distribution by difficulty
    3. Question types to include
    4. Time estimates
    5. Whether to include images and how many
    
    Format your response as a valid JSON object with these fields:
    {
      "title": "Evaluation title",
      "description": "Brief description of the evaluation",
      "topics": [
        { "name": "Topic 1", "weight": 0.3, "questionCount": 5 },
        ...
      ],
      "questionTypes": [
        { "type": "multiple_choice", "count": 10 },
        ...
      ],
      "difficulty": {
        "easy": 0.3,
        "medium": 0.5,
        "hard": 0.2
      },
      "estimatedTime": "30 minutes",
      "includeImages": true,
      "imageCount": 2
    }
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
          model: 'gemini-2.5-flash',
          inputTokens: inputTokenCount,
          outputTokens: outputTokenCount,
        }
      };
    } catch (error) {
      throw new Error(`Failed to parse JSON from Gemini response: ${error.message}`);
    }
  }

  /**
   * Generate a fallback plan when AI generation fails
   */
  private generateFallbackPlan(documentId: string): any {
    return {
      title: 'Basic Evaluation',
      description: 'A basic evaluation covering key concepts from the document',
      topics: [
        { name: 'Key Concepts', weight: 0.6, questionCount: 6 },
        { name: 'Application', weight: 0.4, questionCount: 4 },
      ],
      questionTypes: [
        { type: 'multiple_choice', count: 10 },
      ],
      difficulty: {
        easy: 0.3,
        medium: 0.5,
        hard: 0.2,
      },
      estimatedTime: '20 minutes',
      includeImages: false,
      imageCount: 0,
      isGenerated: false,
      documentId,
    };
  }
}
