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
      meta: { planId: plan.id },
    });

    try {
      // Get the document intents
      const intents = await this.artifactsService.getDocumentIntents(documentId);
      if (!intents) {
        throw new Error('No intents found for this document');
      }

      // Generate the evaluation using Gemini
      const evaluation = await this.generateEvalContent(intents, plan);

      // Update the artifact with the generated evaluation
      await this.artifactsService.updateArtifact(artifact.id, {
        status: ArtifactStatus.READY,
        json: evaluation,
      });

      return evaluation;
    } catch (error) {
      this.logger.error(`Failed to generate evaluation for eval ${evalId}: ${error.message}`);
      
      // Mark the artifact as failed
      await this.artifactsService.updateArtifact(artifact.id, {
        status: ArtifactStatus.FAILED,
        error: error.message,
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
  ): Promise<any> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Format the intents and plan for the prompt
    const intentsJson = JSON.stringify(intents, null, 2);
    const planJson = JSON.stringify(plan, null, 2);

    const prompt = `
    ${EVAL_GENERATION_INSTRUCTION}
    
    DOCUMENT INTENTS:
    ${intentsJson}
    
    EVALUATION PLAN:
    ${planJson}
    
    Generate a complete evaluation with items based on the document intents and plan.
    Format your response as a valid JSON object with these fields:
    {
      "title": "Evaluation title",
      "description": "Brief description of the evaluation",
      "instructions": "Instructions for the student taking the evaluation",
      "rubric": {
        "scoring": "Scoring criteria",
        "passingThreshold": 70
      },
      "items": [
        {
          "type": "multiple_choice",
          "prompt": "Question text",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctIdx": 0,
          "hint": "A helpful hint",
          "explanation": "Explanation of the correct answer",
          "hasImage": false,
          "imagePrompt": null,
          "imageUrl": null,
          "metadata": {
            "difficulty": "easy|medium|hard",
            "topic": "Topic name",
            "conceptsTested": ["concept1", "concept2"]
          }
        }
      ]
    }
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
