import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { ChunkService } from '../../rag/services/chunk.service';
import { EmbedService } from '../../rag/services/embed.service';
import { PdfService } from '../../rag/services/pdf.service';
import { Storage } from '@google-cloud/storage';
import { PdfIngestionJobData } from '../queue.service';
import { PdfStatusGateway } from '../../pdf-status.gateway';
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
    private readonly pdfStatusGateway: PdfStatusGateway,
  ) {
    super();
  }

  async process(job: Job<PdfIngestionJobData>): Promise<any> {
    const { documentId, gcsUri, title, pdfId, userId } = job.data;
    this.logger.log(`Processing PDF ingestion job ${job.id} for document ${documentId}`);

    if (userId) {
      this.pdfStatusGateway.sendStatusUpdate(userId, {
        isGenerating: true,
        type: 'ingestion',
        message: 'Downloading and extracting text...'
      });
    }

    try {
      await job.updateProgress(10);

      const { bucket: bucketName, path } = this.parseGcsUri(gcsUri);
      const bucket = this.storage.bucket(bucketName);

      this.logger.log(`Downloading ${path} from ${bucketName}`);
      const [buffer] = await bucket.file(path).download();

      await job.updateProgress(30);

      this.logger.log(`Extracting text from PDF (${buffer.length} bytes)`);
      // Validation logic moved here to catch early failure
      let text;
      try {
        text = await this.pdfService.extractText(buffer);
      } catch (e: any) {
        // Specific handling for known "unsupported" cases from PdfService
        if (e.message.includes('scanned image PDF') || e.message.includes('insufficient text')) {
          this.logger.error(`Validation failed for document ${documentId}: ${e.message}`);
          await this.prisma.document.update({
            where: { id: documentId },
            data: { status: 'FAILED', errorMessage: e.message },
          });
          
          if (userId) {
            this.pdfStatusGateway.sendStatusUpdate(userId, {
              isGenerating: false,
              type: 'ingestion',
              message: 'Failed: Document appears to be a scanned image or empty.'
            });
          }
          // Stop processing immediately without throwing to prevent retry loop for this specific error
          return { status: 'FAILED', reason: e.message };
        }
        throw e;
      }

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
      if (userId) {
        this.pdfStatusGateway.sendStatusUpdate(userId, { isGenerating: false, type: 'ingestion' });
      }
      return result;
    } catch (error: any) {
      if (userId) {
        this.pdfStatusGateway.sendStatusUpdate(userId, { isGenerating: false, type: 'ingestion' });
      }
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
      const errorMsg = 'No extractable text found in chunks. The document might be an image or scanned PDF.';
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'FAILED', errorMessage: errorMsg },
      });
      throw new Error(errorMsg);
    }

    const userId = job.data.userId;
    
    // Process in larger batches to parallelize embedding and saving
    const PROCESS_BATCH_SIZE = 20;
    
    // Clear existing chunks to ensure idempotency (fixes duplicate key error on retries)
    await this.prisma.chunk.deleteMany({
      where: { documentId },
    });
    
    let processedCount = 0;
    
    for (let i = 0; i < chunks.length; i += PROCESS_BATCH_SIZE) {
      const chunkBatch = chunks.slice(i, i + PROCESS_BATCH_SIZE);
      
      if (userId) {
        this.pdfStatusGateway.sendStatusUpdate(userId, {
          isGenerating: true,
          type: 'ingestion',
          message: `Processing batch ${Math.ceil(i/PROCESS_BATCH_SIZE) + 1}/${Math.ceil(chunks.length/PROCESS_BATCH_SIZE)} (Embedding & Saving)...`,
          progress: { current: processedCount, total: chunks.length }
        });
      }

      this.logger.log(`Computing embeddings for batch of ${chunkBatch.length} chunks`);
      const embeddings = await this.embedService.embedTextBatch(chunkBatch.map(c => c.content));

      const chunkData = chunkBatch.map((chunk, idx) => {
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
      
      this.logger.log(`Saving ${chunkData.length} chunks to database`);
      
      try {
        // Parallelize inserts within the batch
        await Promise.all(chunkData.map(data => {
          if (data.embeddingSql) {
            return this.prisma.$executeRawUnsafe(
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
            return this.prisma.chunk.create({
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
        }));

        processedCount += chunkBatch.length;
        const progress = 60 + Math.floor((processedCount / chunks.length) * 35);
        await job.updateProgress(progress);
        
      } catch (error: any) {
        this.logger.error(`Failed to save batch: ${error.message}`);
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
