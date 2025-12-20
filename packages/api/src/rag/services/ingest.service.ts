import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { Storage } from '@google-cloud/storage';
import { ChunkService } from './chunk.service';
import { EmbedService } from './embed.service';
import { PdfService } from './pdf.service';
import { RagRepository } from '../rag.repository';
import { PdfStatusGateway, PdfStatusUpdate } from '../../pdf-status.gateway';

interface IngestContext {
  userId?: string;
  pdfId?: string;
}

@Injectable()
export class IngestService {
  private readonly logger = new Logger(IngestService.name);
  private readonly storage = new Storage();

  constructor(
    private readonly ragRepository: RagRepository,
    private readonly chunkService: ChunkService,
    private readonly embedService: EmbedService,
    private readonly pdfService: PdfService,
    private readonly pdfStatusGateway?: PdfStatusGateway,
  ) {}

  async createFromText(title: string | undefined, text: string, context?: IngestContext) {
    if (!text || !text.trim()) {
      throw new BadRequestException('text is required');
    }

    const document = await this.ragRepository.createDocumentRecord(title, 'text', undefined, 'text/plain', 'PROCESSING');

    // Run in background to avoid timeouts
    (async () => {
      try {
        await this.processDocument(document.id, text, 'text/plain', context);
      } catch (e: any) {
        await this.ragRepository.updateDocumentById(document.id, 'FAILED', e.message);
        this.logger.error(`Background ingestion failed for document ${document.id}: ${e.message}`);
        this.emitChunkingStatus(context, {
          status: 'failed',
          message: `Chunking failed: ${e.message}`,
          isGenerating: false,
        });
      }
    })();

    return { documentId: document.id, status: 'PROCESSING' };
  }

  async createFromUpload(title: string | undefined, file: Express.Multer.File, context?: IngestContext) {
    if (!file) {
      throw new BadRequestException('file is required');
    }

    const document = await this.ragRepository.createDocumentRecord(title || file.originalname, 'upload', file.originalname, file.mimetype, 'PROCESSING');

    // Run in background to avoid timeouts
    (async () => {
      try {
        const text = await this.pdfService.extractText(file.buffer);
        await this.processDocument(document.id, text, 'application/pdf', context);
      } catch (error: any) {
        await this.ragRepository.updateDocumentById(document.id, 'FAILED', error.message);
        this.logger.error(`Background ingestion failed for upload ${document.id}: ${error.message}`);
        this.emitChunkingStatus(context, {
          status: 'failed',
          message: `Chunking failed: ${error.message}`,
          isGenerating: false,
        });
      }
    })();

    return { documentId: document.id, status: 'PROCESSING' };
  }

  async createFromGcs(title: string | undefined, gcsUri: string, context?: IngestContext) {
    if (!gcsUri || !gcsUri.startsWith('gcs://')) {
      throw new BadRequestException('gcsUri must start with gcs://');
    }

    const document = await this.ragRepository.createDocumentRecord(title, 'gcs', gcsUri, 'application/pdf', 'PROCESSING');

    // Run in background to avoid timeouts
    (async () => {
      try {
        const { bucket: bucketName, path } = this.parseGcsUri(gcsUri);
        const bucket = this.storage.bucket(bucketName);
        this.logger.log(`[Background] Downloading ${path} from ${bucketName}`);
        const [buffer] = await bucket.file(path).download();
        const text = await this.pdfService.extractText(buffer);
        await this.processDocument(document.id, text, 'application/pdf', context);
      } catch (error: any) {
        await this.ragRepository.updateDocumentById(document.id, 'FAILED', error.message);
        this.logger.error(`Background ingestion failed for GCS ${document.id}: ${error.message}`);
        this.emitChunkingStatus(context, {
          status: 'failed',
          message: `Chunking failed: ${error.message}`,
          isGenerating: false,
        });
      }
    })();

    return { documentId: document.id, status: 'PROCESSING' };
  }

  async reprocessDocument(documentId: string) {
    const document = await this.ragRepository.findDocumentById(documentId);

    if (!document) {
      throw new BadRequestException('Document not found');
    }

    if (!document.sourceUri || document.sourceType !== 'gcs') {
      throw new BadRequestException('Only GCS-based documents can be reprocessed currently');
    }

    this.logger.log(`Reprocessing document ${documentId}: ${document.title}`);

    // Update status to PROCESSING and clear existing chunks
    await this.ragRepository.deleteChunksByDocument(documentId);

    await this.ragRepository.updateDocumentById(documentId, 'PROCESSING', null);

    // Run in background to avoid dashboard timeouts
    (async () => {
      try {
        const { bucket: bucketName, path } = this.parseGcsUri(document.sourceUri!);
        const bucket = this.storage.bucket(bucketName);
        this.logger.log(`[Reprocess] Downloading ${path} from ${bucketName}`);
        const [buffer] = await bucket.file(path).download();
        this.logger.log(`[Reprocess] Downloaded ${buffer.length} bytes, extracting text...`);
        const text = await this.pdfService.extractText(buffer);
        this.logger.log(`[Reprocess] Extracted ${text.length} chars, starting ingestion...`);
        await this.processDocument(documentId, text, document.mimeType || 'application/pdf');
      } catch (error: any) {
        await this.ragRepository.updateDocumentById(documentId, 'FAILED', error.message);
        this.logger.error(`Background reprocessing failed for document ${documentId}: ${error.message}`);
      }
    })();

    return { message: 'Reprocessing started in background' };
  }

  async reprocessAllDocuments() {
    const documents = await this.ragRepository.listGcsDocuments();

    this.logger.log(`Queueing reprocessing for ${documents.length} GCS documents`);

    // Run in background
    (async () => {
      for (const doc of documents) {
        try {
          await this.reprocessDocument(doc.id);
          this.logger.log(`Successfully reprocessed ${doc.id} (${doc.title})`);
        } catch (e: any) {
          this.logger.error(`Failed to reprocess ${doc.id}: ${e.message}`);
        }
      }
    })().catch((err) => {
      this.logger.error('Fatal error in bulk reprocessing background task', err);
    });

    return { message: `Started reprocessing ${documents.length} documents in background` };
  }

  private parseGcsUri(uri: string): { bucket: string; path: string } {
    const parts = uri.replace('gcs://', '').split('/');
    const bucket = parts.shift();
    const path = parts.join('/');
    if (!bucket || !path) {
      throw new BadRequestException('Invalid gcsUri');
    }
    return { bucket, path };
  }

  private async processDocument(documentId: string, text: string, mimeType: string, context?: IngestContext) {
    this.logger.log(`Processing document ${documentId} with ${text.length} chars`);
    const chunks = this.chunkService.chunkText(text);
    if (!chunks.length) {
      await this.ragRepository.updateDocumentById(documentId, 'FAILED', 'No extractable text');
      this.emitChunkingStatus(context, {
        status: 'failed',
        message: 'No extractable text available for chunking',
        isGenerating: false,
      });
      throw new BadRequestException('No extractable text');
    }

    this.logger.log(`Computing embeddings for ${chunks.length} chunks`);
    const embeddings = await Promise.all(chunks.map((chunk) => this.embedService.embedText(chunk.content)));

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
    this.emitChunkingStatus(context, {
      status: 'running',
      message: 'Starting PDF chunking...',
      current: 0,
      total: chunkData.length,
      isGenerating: true,
    });

    // Process in batches outside of a transaction to avoid Prisma Accelerate timeouts (15s limit)
    // Reduce batch size for better stability with Accelerate
    const BATCH_SIZE = 10;
    const totalBatches = Math.ceil(chunkData.length / BATCH_SIZE);
    let processed = 0;

    for (let i = 0; i < chunkData.length; i += BATCH_SIZE) {
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const batch = chunkData.slice(i, i + BATCH_SIZE);
      this.logger.log(`[Batch ${batchNumber}/${totalBatches}] Processing ${batch.length} chunks for document ${documentId}`);

      try {
        // Use a simpler approach without interactive transaction to avoid Accelerate timeouts
        for (const data of batch) {
          if (data.embeddingSql) {
            await this.ragRepository.insertChunkWithVector(data.id, data.documentId, data.chunkIndex, data.content, data.contentHash, data.startChar, data.endChar, data.embeddingJson as any, data.embeddingSql);
          } else {
            await this.ragRepository.createChunkRecord(data.documentId, data.chunkIndex, data.content, data.contentHash, data.startChar, data.endChar, data.embeddingJson as any, data.id);
          }
        }
        this.logger.log(`[Batch ${batchNumber}/${totalBatches}] Successfully saved ${batch.length} chunks`);
        processed += batch.length;
        this.emitChunkingStatus(context, {
          status: 'running',
          message: `Chunking batch ${batchNumber}/${totalBatches}`,
          current: Math.min(processed, chunkData.length),
          total: chunkData.length,
          progress: chunkData.length ? Math.min(processed / chunkData.length, 1) : undefined,
          isGenerating: true,
        });
      } catch (error: any) {
        this.logger.error(`[Batch ${batchNumber}/${totalBatches}] Failed to save batch: ${error.message}`);
        this.emitChunkingStatus(context, {
          status: 'failed',
          message: `Chunking failed: ${error.message}`,
          isGenerating: false,
        });
        throw error; // Re-throw to fail the document status
      }
    }

    await this.ragRepository.updateDocumentById(documentId, 'COMPLETED', null, mimeType);
    this.emitChunkingStatus(context, {
      status: 'completed',
      message: `Chunking complete (${chunkData.length} chunks)`,
      current: chunkData.length,
      total: chunkData.length,
      progress: 1,
      isGenerating: false,
    });

    return { documentId, status: 'COMPLETED', chunks: chunks.length };
  }

  private emitChunkingStatus(context: IngestContext | undefined, update: PdfStatusUpdate) {
    if (!context?.userId || !this.pdfStatusGateway) {
      return;
    }

    this.pdfStatusGateway.sendStatusUpdate(context.userId, {
      phase: 'chunking',
      pdfId: context.pdfId,
      ...update,
    });
  }
}
