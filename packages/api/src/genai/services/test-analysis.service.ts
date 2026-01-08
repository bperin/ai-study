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
  async analyzeTestAttempt(params: {
    attemptId: string;
    evalId: string;
    documentId: string;
    userId: string;
    answers: any[];
    correctAnswers: any[];
    wrongAnswers: any[];
  }): Promise<any> {
    const { attemptId, evalId, documentId, userId, answers, correctAnswers, wrongAnswers } = params;

    // Create a pending artifact to track the analysis
    const artifact = await this.artifactsService.createArtifact({
      type: ArtifactType.SUMMARY,
      status: ArtifactStatus.GENERATING,
      documentId,
      evalId,
      attemptId,
      userId,
    });

    try {
      // Generate the analysis using Gemini
      const analysis = await this.generateAnalysis(answers, correctAnswers, wrongAnswers);

      // Update the artifact with the generated analysis
      await this.artifactsService.updateArtifact(artifact.id, {
        status: ArtifactStatus.READY,
        json: analysis,
      });

      return analysis;
    } catch (error) {
      this.logger.error(`Failed to analyze test attempt ${attemptId}: ${error.message}`);
      
      // Mark the artifact as failed
      await this.artifactsService.updateArtifact(artifact.id, {
        status: ArtifactStatus.FAILED,
        error: error.message,
      });

      // Return a basic analysis with error information
      return {
        summary: `Analysis failed: ${error.message}`,
        weakAreas: [],
        studyStrategies: ['Review the material and try again.'],
        strengths: [],
      };
    }
  }

  /**
   * Generate test analysis using Gemini
   */
  private async generateAnalysis(
    answers: any[],
    correctAnswers: any[],
    wrongAnswers: any[],
  ): Promise<any> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from Gemini response');
    }

    try {
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      throw new Error(`Failed to parse JSON from Gemini response: ${error.message}`);
    }
  }
}
