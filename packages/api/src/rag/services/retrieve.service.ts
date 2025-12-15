import { Injectable } from '@nestjs/common';
import { Chunk } from '@prisma/client';
import { EmbedService } from './embed.service';
import { keywordScore, limitContextByLength } from '../util/score';
import { cosineSimilarity } from '../util/cosine';

export interface ScoredChunk extends Chunk {
  score: number;
}

@Injectable()
export class RetrieveService {
  private readonly defaultTopK = 6;

  constructor(private readonly embedService: EmbedService) {}

  async rankChunks(question: string, chunks: Chunk[], requestedTopK?: number): Promise<ScoredChunk[]> {
    const topK = requestedTopK ?? this.defaultTopK;
    if (!chunks.length) {
      return [];
    }

    const useEmbeddings = this.embedService.isEnabled() && chunks.every((chunk) => Array.isArray(chunk.embeddingJson));
    let scored: ScoredChunk[];

    if (useEmbeddings) {
      const questionEmbedding = await this.embedService.embedText(question);
      scored = chunks.map((chunk) => {
        const embedding = Array.isArray(chunk.embeddingJson) ? (chunk.embeddingJson as number[]) : [];
        const score = cosineSimilarity(questionEmbedding, embedding);
        return { ...chunk, score } as ScoredChunk;
      });
    } else {
      scored = chunks.map((chunk) => ({ ...chunk, score: keywordScore(question, chunk.content) } as ScoredChunk));
    }

    scored.sort((a, b) => b.score - a.score || a.chunkIndex - b.chunkIndex);
    const limited = scored.slice(0, topK);
    return limitContextByLength(limited);
  }
}
