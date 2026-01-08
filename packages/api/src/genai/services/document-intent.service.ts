import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ArtifactsService } from '../../domain/artifacts/artifacts.service';
import { ArtifactType, ArtifactStatus } from '@prisma/client';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class DocumentIntentService {
  private readonly logger = new Logger(DocumentIntentService.name);
  private readonly genAI: GoogleGenAI;

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
      meta: { title: documentTitle },
    });

    try {
      // Generate the intents using Gemini
      const intents = await this.generateIntents(documentTitle, fileSearchStoreName);

      // Update the artifact with the generated intents
      await this.artifactsService.updateArtifact(artifact.id, {
        status: ArtifactStatus.READY,
        json: intents,
      });

      return intents;
    } catch (error) {
      this.logger.error(`Failed to extract intents for document ${documentId}: ${error.message}`);
      
      // Mark the artifact as failed
      await this.artifactsService.updateArtifact(artifact.id, {
        status: ArtifactStatus.FAILED,
        error: error.message,
      });

      // Return a basic intent structure as fallback
      return this.generateFallbackIntents(documentTitle);
    }
  }

  /**
   * Generate intents using Gemini
   */
  private async generateIntents(documentTitle: string, fileSearchStoreName?: string): Promise<any> {
    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
    Analyze the document titled "${documentTitle}" and extract learning intents.
    
    Provide a structured JSON response with the following:
    1. Main topics covered in the document
    2. Suggested learning objectives
    3. Recommended question types (multiple choice, short answer, etc.)
    4. Difficulty levels for different sections
    5. Key concepts that should be tested
    
    Format your response as a valid JSON object with these fields:
    {
      "topics": ["topic1", "topic2", ...],
      "objectives": [
        { "title": "Objective 1", "description": "...", "difficulty": "easy|medium|hard" },
        ...
      ],
      "questionTypes": ["multiple_choice", "short_answer", ...],
      "keyConcepts": ["concept1", "concept2", ...],
      "recommendedEvalCount": 2,
      "recommendedItemsPerEval": 10
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

  /**
   * Generate fallback intents when AI generation fails
   */
  private generateFallbackIntents(documentTitle: string): any {
    return {
      topics: [`Content from ${documentTitle}`],
      objectives: [
        { title: 'Understand key concepts', description: 'Comprehend the main ideas presented in the document', difficulty: 'medium' },
        { title: 'Apply knowledge', description: 'Apply concepts from the document to practical scenarios', difficulty: 'hard' },
      ],
      questionTypes: ['multiple_choice', 'short_answer'],
      keyConcepts: ['Main concepts from document'],
      recommendedEvalCount: 1,
      recommendedItemsPerEval: 10,
      isGenerated: false,
    };
  }
}
