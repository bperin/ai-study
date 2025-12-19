import { Injectable, Logger } from '@nestjs/common';
import { VertexAI } from '@google-cloud/vertexai';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly modelName = process.env.GEMINI_MODEL || 'gemini-1.5-flash-001';
  private readonly projectId = process.env.GCP_PROJECT_ID;
  private readonly location = process.env.VERTEX_LOCATION || 'us-central1';
  private readonly vertexAi?: VertexAI;

  constructor() {
    if (this.projectId) {
      this.vertexAi = new VertexAI({ project: this.projectId, location: this.location });
      this.logger.log(`Gemini configured for project ${this.projectId} in ${this.location}`);
    } else {
      this.logger.warn('GCP_PROJECT_ID not set; falling back to deterministic responses');
    }
  }

  async generateAnswer(systemPrompt: string, context: string, question: string): Promise<{ text: string; model: string }> {
    const userPrompt = `Context:\n${context}\n\nQuestion: ${question}\nAnswer:`;

    if (!this.vertexAi) {
      return { text: this.fallbackAnswer(context), model: 'fallback' };
    }

    try {
      const model = this.vertexAi.getGenerativeModel({
        model: this.modelName,
        systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
      });

      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ],
      });

      const text = result.response?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || '')
        .join('')
        .trim();

      return { text: text || '', model: this.modelName };
    } catch (error) {
      this.logger.error('Gemini generation failed; using fallback', error as Error);
      return { text: this.fallbackAnswer(context), model: this.modelName };
    }
  }

  private fallbackAnswer(context: string): string {
    if (!context || !context.trim()) {
      return 'Not found in document.';
    }

    const sentences = context
      .replace(/\n+/g, ' ')
      .split(/(?<=[.!?])\s+/)
      .filter(Boolean);
    const excerpt = sentences.slice(0, 2).join(' ').trim();
    return excerpt || context.slice(0, 400);
  }
}
