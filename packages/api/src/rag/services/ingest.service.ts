import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { DocumentRepository } from '../../shared/repositories/document.repository';
import { ChunkService } from './chunk.service';
import { EmbedService } from './embed.service';
import { PdfService } from './pdf.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger as WinstonLogger } from 'winston';

@Injectable()
export class IngestService {
  private readonly storage = new Storage();

  constructor(
    private readonly documentRepository: DocumentRepository,
    private readonly chunkService: ChunkService,
    private readonly embedService: EmbedService,
    private readonly pdfService: PdfService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: WinstonLogger,
  ) {}

  async createFromText(title: string | undefined, text: string) {
    if (!text || !text.trim()) {
      throw new BadRequestException('text is required');
    }

    const document = await this.documentRepository.create({
      title,
      sourceType: 'TEXT',
      mimeType: 'text/plain',
      status: 'PROCESSING',
    });

    // Run in background to avoid timeouts
    (async () => {
      try {
        await this.processDocument(document.id, text, 'text/plain');
      } catch (e: any) {
        await this.documentRepository.update(document.id, { 
          status: 'FAILED', 
          errorMessage: e.message 
        });
        this.logger.error(`Background ingestion failed for document ${document.id}: ${e.message}`);
      }
    })();

    return { documentId: document.id, status: 'PROCESSING' };
  }

  async createFromUpload(title: string | undefined, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('file is required');
    }

    const document = await this.documentRepository.create({
      title: title || file.originalname,
      sourceType: 'UPLOAD',
      mimeType: file.mimetype,
      status: 'PROCESSING',
    });

    // Run in background to avoid timeouts
    (async () => {
      try {
        const text = await this.pdfService.extractText(file.buffer);
        await this.processDocument(document.id, text, 'application/pdf');
      } catch (error: any) {
        await this.documentRepository.update(document.id, { 
          status: 'FAILED', 
          errorMessage: error.message 
        });
        this.logger.error(`Background ingestion failed for upload ${document.id}: ${error.message}`);
      }
    })();

    return { documentId: document.id, status: 'PROCESSING' };
  }

  async createFromGcs(title: string | undefined, gcsUri: string) {
    if (!gcsUri || !gcsUri.startsWith('gcs://')) {
      throw new BadRequestException('gcsUri must start with gcs://');
    }

    const document = await this.documentRepository.create({
      title,
      sourceType: 'GCS',
      sourceUri: gcsUri,
      mimeType: 'application/pdf',
      status: 'PROCESSING',
    });

    // Run in background to avoid timeouts
    (async () => {
      try {
        const { bucket: bucketName, path } = this.parseGcsUri(gcsUri);
        const bucket = this.storage.bucket(bucketName);
        this.logger.info(`[Background] Downloading ${path} from ${bucketName}`);
        const [buffer] = await bucket.file(path).download();
        const text = await this.pdfService.extractText(buffer);
        await this.processDocument(document.id, text, 'application/pdf');
      } catch (error: any) {
        await this.documentRepository.update(document.id, { 
          status: 'FAILED', 
          errorMessage: error.message 
        });
        this.logger.error(`Background ingestion failed for GCS ${document.id}: ${error.message}`);
      }
    })();

    return { documentId: document.id, status: 'PROCESSING' };
  }

  async reprocessDocument(documentId: string) {
    const document = await this.documentRepository.findById(documentId);

    if (!document) {
      throw new BadRequestException('Document not found');
    }

    if (!document.sourceUri || document.sourceType !== 'gcs') {
      throw new BadRequestException('Only GCS-based documents can be reprocessed currently');
    }

    this.logger.info(`Reprocessing document ${documentId}: ${document.title}`);

    // Update status to PROCESSING and clear existing chunks
    await this.documentRepository.deleteChunksByDocumentId(documentId);

    await this.documentRepository.update(documentId, { 
      status: 'PROCESSING', 
      errorMessage: null 
    });

    // Run in background to avoid dashboard timeouts
    (async () => {
      try {
        const { bucket: bucketName, path } = this.parseGcsUri(document.sourceUri!);
        const bucket = this.storage.bucket(bucketName);
        this.logger.info(`[Reprocess] Downloading ${path} from ${bucketName}`);
        const [buffer] = await bucket.file(path).download();
        this.logger.info(`[Reprocess] Downloaded ${buffer.length} bytes, extracting text...`);
        const text = await this.pdfService.extractText(buffer);
        this.logger.info(`[Reprocess] Extracted ${text.length} chars, starting ingestion...`);
        await this.processDocument(documentId, text, document.mimeType || 'application/pdf');
      } catch (error: any) {
        await this.documentRepository.update(documentId, { 
          status: 'FAILED', 
          errorMessage: error.message 
        });
        this.logger.error(`Background reprocessing failed for document ${documentId}: ${error.message}`);
      }
    })();

    return { message: 'Reprocessing started in background' };
  }

  async reprocessAllDocuments() {
    const documents = await this.documentRepository.findBySourceType('GCS');

    this.logger.info(`Queueing reprocessing for ${documents.length} GCS documents`);

    // Run in background
    (async () => {
      for (const doc of documents) {
        try {
          await this.reprocessDocument(doc.id);
          this.logger.info(`Successfully reprocessed ${doc.id} (${doc.title})`);
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

  private async processDocument(documentId: string, text: string, mimeType: string) {
    this.logger.info(`Processing document ${documentId} with ${text.length} chars`);
    const chunks = this.chunkService.chunkText(text);
    if (!chunks.length) {
      await this.documentRepository.update(documentId, { 
        status: 'FAILED', 
        errorMessage: 'No extractable text' 
      });
      throw new BadRequestException('No extractable text');
    }

    this.logger.info(`Computing embeddings for ${chunks.length} chunks`);
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

    this.logger.info(`Saving ${chunkData.length} chunks to database in batches`);

    // Process in batches outside of a transaction to avoid Prisma Accelerate timeouts (15s limit)
    // Reduce batch size for better stability with Accelerate
    const BATCH_SIZE = 10;
    const totalBatches = Math.ceil(chunkData.length / BATCH_SIZE);

    for (let i = 0; i < chunkData.length; i += BATCH_SIZE) {
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const batch = chunkData.slice(i, i + BATCH_SIZE);
      this.logger.info(`[Batch ${batchNumber}/${totalBatches}] Processing ${batch.length} chunks for document ${documentId}`);

      try {
        // Use a simpler approach without interactive transaction to avoid Accelerate timeouts
        for (const data of batch) {
          if (data.embeddingSql) {
            await this.documentRepository.createChunkWithVector(data);
          } else {
            await this.documentRepository.createChunk({
              id: data.id,
              documentId: data.documentId,
              chunkIndex: data.chunkIndex,
              content: data.content,
              contentHash: data.contentHash,
              startChar: data.startChar,
              endChar: data.endChar,
              embeddingJson: data.embeddingJson,
            });
          }
        }
        this.logger.info(`[Batch ${batchNumber}/${totalBatches}] Successfully saved ${batch.length} chunks`);
      } catch (error: any) {
        this.logger.error(`[Batch ${batchNumber}/${totalBatches}] Failed to save batch: ${error.message}`);
        throw error; // Re-throw to fail the document status
      }
    }

    await this.documentRepository.update(documentId, { 
      status: 'COMPLETED', 
      mimeType, 
      errorMessage: null 
    });

    return { documentId, status: 'COMPLETED', chunks: chunks.length };
  }
}
