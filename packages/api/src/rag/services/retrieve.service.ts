import { Injectable } from '@nestjs/common';
import { Chunk } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EmbedService } from './embed.service';
import { keywordScore, limitContextByLength } from '../util/score';
import { cosineSimilarity } from '../util/cosine';

export interface ScoredChunk extends Chunk {
  score: number;
}

@Injectable()
export class RetrieveService {
  private readonly defaultTopK = 6;

  constructor(
    private readonly prisma: PrismaService,
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
      if (await this.embedService.isEnabled()) {
        const { Prisma } = require('@prisma/client');
        const vectorString = `[${questionEmbedding.join(',')}]`;
        
        const results = await this.prisma.$queryRaw<Array<{
          id: string;
          documentId: string;
          chunkIndex: number;
          content: string;
          contentHash: string;
          startChar: number | null;
          endChar: number | null;
          embeddingJson: any;
          createdAt: Date;
          score: number;
        }>>`
          SELECT 
            id, 
            "documentId", 
            "chunkIndex", 
            "content", 
            "contentHash", 
            "startChar", 
            "endChar", 
            "embeddingJson", 
            "createdAt",
            (1 - ("embeddingVec" <=> ${Prisma.raw(`'${vectorString}'`)}::vector)) as score
          FROM "Chunk"
          WHERE "documentId" = ${chunks[0].documentId}
          ORDER BY score DESC
          LIMIT ${topK * 2}
        `;
        
        if (results.length > 0) {
          scored = results.map(r => ({ ...r, score: Number(r.score) }));
          console.log(`[RetrieveService] Vector search found ${scored.length} chunks`);
        }
      }
    } catch (e) {
      console.error('[RetrieveService] Vector SQL search failed:', e);
      console.error('[RetrieveService] Falling back to in-memory search');
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
        scored = chunks.map((chunk) => ({ ...chunk, score: keywordScore(question, chunk.content) } as ScoredChunk));
      }
    }

    scored.sort((a, b) => b.score - a.score || a.chunkIndex - b.chunkIndex);
    const limited = scored.slice(0, topK);
    return limitContextByLength(limited);
  }
}
