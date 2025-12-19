import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { ChunkService } from '../../rag/services/chunk.service';
import { EmbedService } from '../../rag/services/embed.service';
import { PdfService } from '../../rag/services/pdf.service';
import { Storage } from '@google-cloud/storage';
import { PdfIngestionJobData } from '../queue.service';
import * as crypto from 'crypto';

@Processor('pdf-ingestion')
export class PdfIngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(PdfIngestionProcessor.name);
  private readonly storage = new Storage();

  constructor(
    private readonly prisma: PrismaService,
    private readonly chunkService: ChunkService,
    private readonly embedService: EmbedService,
    private readonly pdfService: PdfService,
  ) {
    super();
  }

  async process(job: Job<PdfIngestionJobData>): Promise<any> {
    const { documentId, gcsUri, title, pdfId } = job.data;
    this.logger.log(`Processing PDF ingestion job ${job.id} for document ${documentId}`);

    try {
      await job.updateProgress(10);

      const { bucket: bucketName, path } = this.parseGcsUri(gcsUri);
      const bucket = this.storage.bucket(bucketName);

      this.logger.log(`Downloading ${path} from ${bucketName}`);
      const [buffer] = await bucket.file(path).download();

      await job.updateProgress(30);

      this.logger.log(`Extracting text from PDF (${buffer.length} bytes)`);
      const text = await this.pdfService.extractText(buffer);

      await job.updateProgress(50);

      this.logger.log(`Processing document with ${text.length} characters`);
      const result = await this.processDocument(documentId, text, 'application/pdf', job);

      if (pdfId) {
        await this.prisma.pdf.update({
          where: { id: pdfId },
          data: { documentId },
        });
        this.logger.log(`Linked PDF ${pdfId} to Document ${documentId}`);
      }

      await job.updateProgress(100);
      return result;
    } catch (error: any) {
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'FAILED', errorMessage: error.message },
      });
      this.logger.error(`PDF ingestion failed for document ${documentId}: ${error.message}`);
      throw error;
    }
  }

  private parseGcsUri(uri: string): { bucket: string; path: string } {
    const parts = uri.replace('gcs://', '').split('/');
    const bucket = parts.shift();
    const path = parts.join('/');
    if (!bucket || !path) {
      throw new Error('Invalid gcsUri');
    }
    return { bucket, path };
  }

  private async processDocument(documentId: string, text: string, mimeType: string, job: Job) {
    this.logger.log(`Processing document ${documentId} with ${text.length} chars`);
    const chunks = this.chunkService.chunkText(text);

    if (!chunks.length) {
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'FAILED', errorMessage: 'No extractable text' },
      });
      throw new Error('No extractable text');
    }

    await job.updateProgress(60);

    this.logger.log(`Computing embeddings for ${chunks.length} chunks`);
    const embeddings = await Promise.all(chunks.map((chunk) => this.embedService.embedText(chunk.content)));

    await job.updateProgress(70);

    const chunkData = chunks.map((chunk, idx) => {
      const embedding = embeddings[idx];
      const embeddingSql = embedding ? `[${embedding.join(',')}]` : null;

      return {
        id: crypto.randomUUID(),
        documentId,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        contentHash: chunk.contentHash,
        startChar: chunk.startChar,
        endChar: chunk.endChar,
        embeddingJson: embedding || null,
        embeddingSql,
      };
    });

    this.logger.log(`Saving ${chunkData.length} chunks to database in batches`);

    // Clear existing chunks to ensure idempotency (fixes duplicate key error on retries)
    await this.prisma.chunk.deleteMany({
      where: { documentId },
    });

    const BATCH_SIZE = 10;
    const totalBatches = Math.ceil(chunkData.length / BATCH_SIZE);

    for (let i = 0; i < chunkData.length; i += BATCH_SIZE) {
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const batch = chunkData.slice(i, i + BATCH_SIZE);
      this.logger.log(`[Batch ${batchNumber}/${totalBatches}] Processing ${batch.length} chunks`);

      try {
        for (const data of batch) {
          if (data.embeddingSql) {
            await this.prisma.$executeRawUnsafe(
              `INSERT INTO "Chunk" ("id", "documentId", "chunkIndex", "content", "contentHash", "startChar", "endChar", "embeddingJson", "embeddingVec")
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::vector)`,
              data.id,
              data.documentId,
              data.chunkIndex,
              data.content,
              data.contentHash,
              data.startChar,
              data.endChar,
              JSON.stringify(data.embeddingJson),
              data.embeddingSql,
            );
          } else {
            await this.prisma.chunk.create({
              data: {
                id: data.id,
                documentId: data.documentId,
                chunkIndex: data.chunkIndex,
                content: data.content,
                contentHash: data.contentHash,
                startChar: data.startChar,
                endChar: data.endChar,
                embeddingJson: data.embeddingJson as any,
              },
            });
          }
        }

        const progress = 70 + Math.floor((batchNumber / totalBatches) * 25);
        await job.updateProgress(progress);

        this.logger.log(`[Batch ${batchNumber}/${totalBatches}] Successfully saved ${batch.length} chunks`);
      } catch (error: any) {
        this.logger.error(`[Batch ${batchNumber}/${totalBatches}] Failed to save batch: ${error.message}`);
        throw error;
      }
    }

    await this.prisma.document.update({
      where: { id: documentId },
      data: { status: 'COMPLETED', mimeType, errorMessage: null },
    });

    return { documentId, status: 'COMPLETED', chunks: chunks.length };
  }
}
