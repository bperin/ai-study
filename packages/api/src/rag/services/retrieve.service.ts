import { Injectable, Inject } from '@nestjs/common';
import { Chunk } from '@prisma/client';
import { DocumentRepository } from '../../shared/repositories/document.repository';
import { EmbedService } from './embed.service';
import { keywordScore, limitContextByLength } from '../util/score';
import { cosineSimilarity } from '../util/cosine';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

export interface ScoredChunk extends Chunk {
  score: number;
}

@Injectable()
export class RetrieveService {
  private readonly defaultTopK = 6;

  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly embedService: EmbedService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async retrieveChunks(pdfFilename: string, gcsPath: string): Promise<Chunk[]> {
    const document = await this.documentRepository.findByGcsUrisOrTitles([gcsPath], [pdfFilename]);
    if (!document || document.length === 0) {
      return [];
    }
    const docId = document[0].id;
    return this.documentRepository.findChunksByDocumentId(docId) as Promise<Chunk[]>;
  }

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

        const results = await this.documentRepository.queryRawVectorSimilarity(chunks, vectorString, topK);

        if (results.length > 0) {
          scored = results.map((r) => ({ ...r, score: Number(r.score) }));
          this.logger.info(`Vector search found ${scored.length} chunks`);
        }
      }
    } catch (e) {
      this.logger.error('Vector SQL search failed', { error: (e as Error).message });
      this.logger.info('Falling back to in-memory search');
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
}
