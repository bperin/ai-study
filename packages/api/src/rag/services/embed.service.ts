import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { VertexAI } from '@google-cloud/vertexai';

@Injectable()
export class EmbedService {
  private readonly logger = new Logger(EmbedService.name);
  private readonly enabled = process.env.ENABLE_EMBEDDINGS === 'true';
  private readonly projectId = process.env.GCP_PROJECT_ID;
  private readonly location = process.env.VERTEX_LOCATION || 'us-central1';
  private readonly modelName = process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004';
  private readonly vertexAi?: VertexAI;

  constructor() {
    if (this.enabled && this.projectId) {
      this.vertexAi = new VertexAI({ project: this.projectId, location: this.location });
      this.logger.log(`Embeddings enabled with model ${this.modelName} in ${this.location}`);
    } else if (this.enabled) {
      this.logger.warn('ENABLE_EMBEDDINGS is true but GCP_PROJECT_ID is missing; falling back to hash-based vectors');
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async embedText(text: string): Promise<number[]> {
    if (!this.enabled) {
      return this.fallbackEmbedding(text);
    }

    if (this.vertexAi) {
      try {
        const model = this.vertexAi.getGenerativeModel({ model: this.modelName });
        
        // Use REST API since embedContent is missing in this SDK version
        // Cast to any to access private fetchToken method which exists at runtime
        const token = await (model as any).fetchToken();
        const endpoint = `https://${this.location}-aiplatform.googleapis.com/v1/projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.modelName}:predict`;
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            instances: [{ content: text }]
          })
        });

        if (!response.ok) {
          throw new Error(`Vertex AI API error: ${response.statusText}`);
        }

        const data = await response.json();
        const values = data.predictions?.[0]?.embeddings?.values || data.predictions?.[0]?.embedding;
        if (values && values.length > 0) {
          return values;
        }
        this.logger.warn('Received empty embedding vector from Vertex AI, using fallback');
      } catch (error) {
        this.logger.error('Failed to fetch embeddings from Vertex AI; using fallback', error as Error);
      }
    }

    return this.fallbackEmbedding(text);
  }

  private fallbackEmbedding(text: string): number[] {
    const digest = createHash('sha256').update(text, 'utf8').digest();
    const values: number[] = [];
    for (let i = 0; i < digest.length; i++) {
      const centered = digest[i] - 128; // range roughly -128..127
      values.push(centered / 128);
    }
    // Repeat to reach a stable length for cosine similarity
    while (values.length < 128) {
      values.push(...values);
    }
    return values.slice(0, 128);
  }
}
