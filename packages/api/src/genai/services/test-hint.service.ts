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
  async generateHint(params: {
    attemptId: string;
    evalItemId: string;
    userId: string;
    question: string;
    options: string[];
  }): Promise<string> {
    const { attemptId, evalItemId, userId, question, options } = params;

    // Create a pending artifact to track the hint generation
    const artifact = await this.artifactsService.createArtifact({
      type: ArtifactType.OTHER,
      status: ArtifactStatus.GENERATING,
      evalItemId,
      attemptId,
      userId,
      meta: { type: 'hint' },
    });

    try {
      // Generate the hint using Gemini
      const hint = await this.generateHintText(question, options);

      // Update the artifact with the generated hint
      await this.artifactsService.updateArtifact(artifact.id, {
        status: ArtifactStatus.READY,
        text: hint,
      });

      return hint;
    } catch (error) {
      this.logger.error(`Failed to generate hint for question ${evalItemId}: ${error.message}`);
      
      // Mark the artifact as failed
      await this.artifactsService.updateArtifact(artifact.id, {
        status: ArtifactStatus.FAILED,
        error: error.message,
      });

      // Return a generic hint
      return "I'm having trouble generating a specific hint right now. Try reviewing the question carefully and thinking about the key concepts it's testing.";
    }
  }

  /**
   * Generate hint text using Gemini
   */
  private async generateHintText(
    question: string,
    options: string[],
  ): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = TEST_ASSISTANCE_HINT_INSTRUCTION(question, options);

    const result = await model.generateContent(prompt);
    return result.response.text();
  }
}
