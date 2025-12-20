import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { Storage } from '@google-cloud/storage';
import { ChunkService } from './chunk.service';
import { EmbedService } from './embed.service';
import { PdfService } from './pdf.service';
import { RagRepository } from '../rag.repository';
import { CreateDocumentRecordDto } from '../dto/create-document-record.dto';
import { UpdateDocumentRecordDto } from '../dto/update-document-record.dto';
import { CreateChunkRecordDto } from '../dto/create-chunk-record.dto';

@Injectable()
export class IngestService {
  private readonly logger = new Logger(IngestService.name);
  private readonly storage = new Storage();

  constructor(
    private readonly ragRepository: RagRepository,
    private readonly chunkService: ChunkService,
    private readonly embedService: EmbedService,
    private readonly pdfService: PdfService,
  ) {}

  async createFromText(title: string | undefined, text: string) {
    if (!text || !text.trim()) {
      throw new BadRequestException('text is required');
    }

    const docDto = new CreateDocumentRecordDto();
    docDto.title = title;
    docDto.sourceType = 'text';
    docDto.mimeType = 'text/plain';
    docDto.status = 'PROCESSING';
    const document = await this.ragRepository.createDocumentRecord(docDto);

    // Run in background to avoid timeouts
    (async () => {
      try {
        await this.processDocument(document.id, text, 'text/plain');
      } catch (e: any) {
        const updateDto = new UpdateDocumentRecordDto();
        updateDto.status = 'FAILED';
        updateDto.errorMessage = e.message;
        await this.ragRepository.updateDocumentById(document.id, updateDto);
        this.logger.error(`Background ingestion failed for document ${document.id}: ${e.message}`);
      }
    })();

    return { documentId: document.id, status: 'PROCESSING' };
  }

  async createFromUpload(title: string | undefined, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('file is required');
    }

    const uploadDto = new CreateDocumentRecordDto();
    uploadDto.title = title || file.originalname;
    uploadDto.sourceType = 'upload';
    uploadDto.sourceUri = file.originalname;
    uploadDto.mimeType = file.mimetype;
    uploadDto.status = 'PROCESSING';
    const document = await this.ragRepository.createDocumentRecord(uploadDto);

    // Run in background to avoid timeouts
    (async () => {
      try {
        const text = await this.pdfService.extractText(file.buffer);
        await this.processDocument(document.id, text, 'application/pdf');
      } catch (error: any) {
        const updateDto = new UpdateDocumentRecordDto();
        updateDto.status = 'FAILED';
        updateDto.errorMessage = error.message;
        await this.ragRepository.updateDocumentById(document.id, updateDto);
        this.logger.error(`Background ingestion failed for upload ${document.id}: ${error.message}`);
      }
    })();

    return { documentId: document.id, status: 'PROCESSING' };
  }

  async createFromGcs(title: string | undefined, gcsUri: string) {
    if (!gcsUri || !gcsUri.startsWith('gcs://')) {
      throw new BadRequestException('gcsUri must start with gcs://');
    }

    const gcsDto = new CreateDocumentRecordDto();
    gcsDto.title = title;
    gcsDto.sourceType = 'gcs';
    gcsDto.sourceUri = gcsUri;
    gcsDto.mimeType = 'application/pdf';
    gcsDto.status = 'PROCESSING';
    const document = await this.ragRepository.createDocumentRecord(gcsDto);

    // Run in background to avoid timeouts
    (async () => {
      try {
        const { bucket: bucketName, path } = this.parseGcsUri(gcsUri);
        const bucket = this.storage.bucket(bucketName);
        this.logger.log(`[Background] Downloading ${path} from ${bucketName}`);
        const [buffer] = await bucket.file(path).download();
        const text = await this.pdfService.extractText(buffer);
        await this.processDocument(document.id, text, 'application/pdf');
      } catch (error: any) {
        const updateDto = new UpdateDocumentRecordDto();
        updateDto.status = 'FAILED';
        updateDto.errorMessage = error.message;
        await this.ragRepository.updateDocumentById(document.id, updateDto);
        this.logger.error(`Background ingestion failed for GCS ${document.id}: ${error.message}`);
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

    const processingUpdate = new UpdateDocumentRecordDto();
    processingUpdate.status = 'PROCESSING';
    processingUpdate.errorMessage = null;
    await this.ragRepository.updateDocumentById(documentId, processingUpdate);

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
        const updateDto = new UpdateDocumentRecordDto();
        updateDto.status = 'FAILED';
        updateDto.errorMessage = error.message;
        await this.ragRepository.updateDocumentById(documentId, updateDto);
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

  private async processDocument(documentId: string, text: string, mimeType: string) {
    this.logger.log(`Processing document ${documentId} with ${text.length} chars`);
    const chunks = this.chunkService.chunkText(text);
    if (!chunks.length) {
      const updateDto = new UpdateDocumentRecordDto();
      updateDto.status = 'FAILED';
      updateDto.errorMessage = 'No extractable text';
      await this.ragRepository.updateDocumentById(documentId, updateDto);
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

    // Process in batches outside of a transaction to avoid Prisma Accelerate timeouts (15s limit)
    // Reduce batch size for better stability with Accelerate
    const BATCH_SIZE = 10;
    const totalBatches = Math.ceil(chunkData.length / BATCH_SIZE);

    for (let i = 0; i < chunkData.length; i += BATCH_SIZE) {
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const batch = chunkData.slice(i, i + BATCH_SIZE);
      this.logger.log(`[Batch ${batchNumber}/${totalBatches}] Processing ${batch.length} chunks for document ${documentId}`);

      try {
        // Use a simpler approach without interactive transaction to avoid Accelerate timeouts
        for (const data of batch) {
          if (data.embeddingSql) {
            await this.ragRepository.insertChunkWithVector({
              id: data.id,
              documentId: data.documentId,
              chunkIndex: data.chunkIndex,
              content: data.content,
              contentHash: data.contentHash,
              startChar: data.startChar,
              endChar: data.endChar,
              embeddingJson: data.embeddingJson as any,
              embeddingSql: data.embeddingSql,
            });
          } else {
            const chunkDto = new CreateChunkRecordDto();
            chunkDto.id = data.id;
            chunkDto.documentId = data.documentId;
            chunkDto.chunkIndex = data.chunkIndex;
            chunkDto.content = data.content;
            chunkDto.contentHash = data.contentHash;
            chunkDto.startChar = data.startChar;
            chunkDto.endChar = data.endChar;
            chunkDto.embeddingJson = data.embeddingJson as any;
            await this.ragRepository.createChunkRecord(chunkDto);
          }
        }
        this.logger.log(`[Batch ${batchNumber}/${totalBatches}] Successfully saved ${batch.length} chunks`);
      } catch (error: any) {
        this.logger.error(`[Batch ${batchNumber}/${totalBatches}] Failed to save batch: ${error.message}`);
        throw error; // Re-throw to fail the document status
      }
    }

    const completeDto = new UpdateDocumentRecordDto();
    completeDto.status = 'COMPLETED';
    completeDto.mimeType = mimeType;
    completeDto.errorMessage = null;
    await this.ragRepository.updateDocumentById(documentId, completeDto);

    return { documentId, status: 'COMPLETED', chunks: chunks.length };
  }
}
