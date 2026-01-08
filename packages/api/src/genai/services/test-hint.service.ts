import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { ArtifactsService } from '../../domain/artifacts/artifacts.service';
import { ArtifactType, ArtifactStatus } from '@prisma/client';
import { TEST_ASSISTANCE_HINT_INSTRUCTION } from '../../shared/genai/prompts';

@Injectable()
export class TestHintService {
  private readonly logger = new Logger(TestHintService.name);
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
   * Generate a hint for a specific question during a test attempt
   */
  async generateHint(params: { attemptId: string; evalItemId: string; userId: string; question: string; options: string[] }): Promise<string> {
    const { attemptId, evalItemId, userId, question, options } = params;

    // Create a pending artifact to track the hint generation
    const artifact = await this.artifactsService.createArtifact({
      type: ArtifactType.OTHER,
      status: ArtifactStatus.GENERATING,
      evalItemId,
      attemptId,
      userId,
      meta: {
        type: 'hint',
        startTime: new Date().toISOString(),
      },
    });

    try {
      // Start timing
      const startTime = Date.now();

      // Generate the hint using Gemini
      const { hint, metrics } = await this.generateHintText(question, options);

      // Calculate latency
      const latencyMs = Date.now() - startTime;

      // Update metrics
      const updatedMetrics = {
        ...metrics,
        latencyMs,
        endTime: new Date().toISOString(),
      };

      // Update the artifact with the generated hint
      await this.artifactsService.updateArtifact(artifact.id, {
        status: ArtifactStatus.READY,
        text: hint,
        meta: {
          ...artifact.meta,
          ...updatedMetrics,
        },
      });

      return hint;
    } catch (error) {
      this.logger.error(`Failed to generate hint for question ${evalItemId}: ${error.message}`);

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
   * Generate hint text using Gemini
   */
  private async generateHintText(question: string, options: string[]): Promise<{ hint: string; metrics: any }> {
    const model = this.genAI.getGenerativeModel({ model: this.MODEL_NAME });

    const prompt = TEST_ASSISTANCE_HINT_INSTRUCTION(question, options);

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

    return {
      hint: text,
      metrics: {
        model: this.MODEL_NAME,
        inputTokens: inputTokenCount,
        outputTokens: outputTokenCount,
      },
    };
  }
}
