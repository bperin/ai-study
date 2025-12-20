import { Injectable } from '@nestjs/common';
import { Chunk } from '@prisma/client';
import { EmbedService } from './embed.service';
import { keywordScore, limitContextByLength } from '../util/score';
import { cosineSimilarity } from '../util/cosine';
import { RagRepository } from '../rag.repository';

export interface ScoredChunk extends Chunk {
  score: number;
}

@Injectable()
export class RetrieveService {
  private readonly defaultTopK = 6;

  constructor(
    private readonly ragRepository: RagRepository,
    private readonly embedService: EmbedService,
  ) {}

  async rankChunks(question: string, chunks: Chunk[], requestedTopK?: number): Promise<ScoredChunk[]> {
    const topK = requestedTopK ?? this.defaultTopK;
    if (!chunks.length) {
      return [];
    }

    // Prefer vector similarity search using raw SQL if pgvector is available
    let scored: ScoredChunk[] = [];
    const questionEmbedding = await this.embedService.embedText(question);

    try {
      const vectorSql = `[${questionEmbedding.join(',')}]`;
      const results: any[] = this.embedService.isEnabled() ? await this.ragRepository.vectorSearch(vectorSql, chunks[0].documentId, topK * 2) : [];

      if (results.length > 0) {
        scored = results.map((r) => ({ ...r, score: Number(r.score) }) as ScoredChunk);
      }
    } catch (e) {
      // Fallback to in-memory cosine similarity or keyword search if raw SQL fails
      console.error('[RetrieveService] Vector SQL search failed, falling back:', e);
    }

    if (scored.length === 0) {
      const useEmbeddings = chunks.every((chunk) => Array.isArray(chunk.embeddingJson));
      if (useEmbeddings) {
        scored = chunks.map((chunk) => {
          const embedding = Array.isArray(chunk.embeddingJson) ? (chunk.embeddingJson as number[]) : [];
          const score = cosineSimilarity(questionEmbedding, embedding);
          return { ...chunk, score } as ScoredChunk;
        });
      } else {
        scored = chunks.map((chunk) => ({ ...chunk, score: keywordScore(question, chunk.content) }) as ScoredChunk);
      }
    }

    scored.sort((a, b) => b.score - a.score || a.chunkIndex - b.chunkIndex);
    const limited = scored.slice(0, topK);
    return limitContextByLength(limited);
  }

  findChunksForDocumentLookup(pdfFilename: string, gcsPath: string) {
    return this.ragRepository.findChunksForDocumentLookup(pdfFilename, gcsPath);
  }
}
