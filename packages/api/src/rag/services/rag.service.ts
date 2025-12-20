import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { RetrieveService } from './retrieve.service';
import { GeminiService } from './gemini.service';
import { QueryLog } from '@prisma/client';
import { RagRepository } from '../rag.repository';

@Injectable()
export class RagService {
  private readonly systemPrompt = 'You must only use the provided context chunks from the document. If the answer is not present, reply: Not found in document.';

  constructor(
    private readonly ragRepository: RagRepository,
    private readonly retrieveService: RetrieveService,
    private readonly geminiService: GeminiService,
  ) {}

  async getDocument(documentId: string) {
    const document = await this.ragRepository.findDocumentById(documentId);
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    const chunkCount = await this.ragRepository.countChunksByDocument(documentId);
    return { ...document, chunks: chunkCount };
  }

  async listChunks(documentId: string, limit = 50, offset = 0) {
    await this.ensureDocumentExists(documentId);
    return this.ragRepository.listChunksByDocument(documentId, { skip: offset, take: limit });
  }

  async queryDocument(documentId: string, question: string, topK = 6) {
    const document = await this.ragRepository.findDocumentById(documentId);
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    if (document.status !== 'COMPLETED' && document.status !== 'READY') {
      throw new BadRequestException(`Document is not ready (status=${document.status})`);
    }

    const chunks = await this.ragRepository.listChunksByDocument(documentId);

    const ranked = await this.retrieveService.rankChunks(question, chunks, topK);
    if (!ranked.length) {
      return this.logAndReturn(documentId, question, 'Not found in document.', 'fallback', topK, []);
    }

    const context = ranked.map((chunk) => `[Chunk ${chunk.chunkIndex}]\n${chunk.content.trim()}`).join('\n\n');

    const start = Date.now();
    const { text: answer, model } = await this.geminiService.generateAnswer(this.systemPrompt, context, question);
    const latencyMs = Date.now() - start;

    const usedChunks = ranked.map((chunk) => ({ chunkId: chunk.id, chunkIndex: chunk.chunkIndex, score: chunk.score }));

    return this.logAndReturn(documentId, question, answer || 'Not found in document.', model, topK, usedChunks, latencyMs);
  }

  private async ensureDocumentExists(documentId: string) {
    const exists = await this.ragRepository.findDocumentById(documentId);
    if (!exists) {
      throw new NotFoundException('Document not found');
    }
  }

  private async logAndReturn(documentId: string, question: string, answer: string, model: string, topK: number, usedChunks: { chunkId: string; chunkIndex: number; score: number }[], latencyMs?: number) {
    const payload: Omit<QueryLog, 'id' | 'createdAt'> = {
      documentId,
      question,
      answer,
      model,
      topK,
      usedChunks: usedChunks as any,
      latencyMs,
    } as any;

    await this.ragRepository.createQueryLogEntry(payload);

    return {
      answer,
      citations: usedChunks,
      model,
      latencyMs,
    };
  }
}
