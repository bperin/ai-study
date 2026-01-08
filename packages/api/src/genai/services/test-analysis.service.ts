import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { ArtifactsService } from '../../domain/artifacts/artifacts.service';
import { ArtifactType, ArtifactStatus } from '@prisma/client';
import { TEST_ANALYZER_INSTRUCTION } from '../../shared/genai/prompts';

@Injectable()
export class TestAnalysisService {
  private readonly logger = new Logger(TestAnalysisService.name);
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
   * Analyze a test attempt and provide feedback
   */
  async analyzeTestAttempt(params: { attemptId: string; evalId: string; documentId: string; userId: string; answers: any[]; correctAnswers: any[]; wrongAnswers: any[] }): Promise<any> {
    const { attemptId, evalId, documentId, userId, answers, correctAnswers, wrongAnswers } = params;

    // Create a pending artifact to track the analysis
    const artifact = await this.artifactsService.createArtifact({
      type: ArtifactType.SUMMARY,
      status: ArtifactStatus.GENERATING,
      documentId,
      evalId,
      attemptId,
      userId,
      meta: {
        startTime: new Date().toISOString(),
      },
    });

    try {
      // Start timing
      const startTime = Date.now();

      // Generate the analysis using Gemini
      const { analysis, metrics } = await this.generateAnalysis(answers, correctAnswers, wrongAnswers);

      // Calculate latency
      const latencyMs = Date.now() - startTime;

      // Update metrics
      const updatedMetrics = {
        ...metrics,
        latencyMs,
        endTime: new Date().toISOString(),
      };

      // Update the artifact with the generated analysis
      await this.artifactsService.updateArtifact(artifact.id, {
        status: ArtifactStatus.READY,
        json: analysis,
        meta: {
          ...artifact.meta,
          ...updatedMetrics,
        },
      });

      return analysis;
    } catch (error) {
      this.logger.error(`Failed to analyze test attempt ${attemptId}: ${error.message}`);

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
   * Generate test analysis using Gemini
   */
  private async generateAnalysis(answers: any[], correctAnswers: any[], wrongAnswers: any[]): Promise<{ analysis: any; metrics: any }> {
    const model = this.genAI.getGenerativeModel({ model: this.MODEL_NAME });

    // Format the answers for the prompt
    const answersJson = JSON.stringify(answers, null, 2);
    const correctAnswersJson = JSON.stringify(correctAnswers, null, 2);
    const wrongAnswersJson = JSON.stringify(wrongAnswers, null, 2);

    const prompt = `
    ${TEST_ANALYZER_INSTRUCTION}
    
    TEST RESULTS:
    
    All Answers:
    ${answersJson}
    
    Correct Answers:
    ${correctAnswersJson}
    
    Wrong Answers:
    ${wrongAnswersJson}
    
    Analyze these test results and provide personalized feedback.
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
      const analysis = JSON.parse(jsonMatch[0]);

      return {
        analysis,
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
