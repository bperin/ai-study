import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Storage } from '@google-cloud/storage';
import { PrismaService } from '../../prisma/prisma.service';
import { ChunkService } from './chunk.service';
import { EmbedService } from './embed.service';
import { PdfService } from './pdf.service';

@Injectable()
export class IngestService {
  private readonly logger = new Logger(IngestService.name);
  private readonly storage = new Storage();

  constructor(
    private readonly prisma: PrismaService,
    private readonly chunkService: ChunkService,
    private readonly embedService: EmbedService,
    private readonly pdfService: PdfService,
  ) {}

  async createFromText(title: string | undefined, text: string) {
    if (!text || !text.trim()) {
      throw new BadRequestException('text is required');
    }

    const document = await this.prisma.document.create({
      data: {
        title,
        sourceType: 'text',
        mimeType: 'text/plain',
        status: 'PROCESSING',
      },
    });

    return this.processDocument(document.id, text, 'text/plain');
  }

  async createFromUpload(title: string | undefined, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('file is required');
    }

    const document = await this.prisma.document.create({
      data: {
        title: title || file.originalname,
        sourceType: 'upload',
        sourceUri: file.originalname,
        mimeType: file.mimetype,
        status: 'PROCESSING',
      },
    });

    try {
      const text = await this.pdfService.extractText(file.buffer);
      return await this.processDocument(document.id, text, 'application/pdf');
    } catch (error) {
      await this.prisma.document.update({
        where: { id: document.id },
        data: { status: 'FAILED', errorMessage: (error as Error).message },
      });
      throw error;
    }
  }

  async createFromGcs(title: string | undefined, gcsUri: string) {
    if (!gcsUri || !gcsUri.startsWith('gcs://')) {
      throw new BadRequestException('gcsUri must start with gcs://');
    }

    const document = await this.prisma.document.create({
      data: {
        title,
        sourceType: 'gcs',
        sourceUri: gcsUri,
        mimeType: 'application/pdf',
        status: 'PROCESSING',
      },
    });

    try {
      const { bucket: bucketName, path } = this.parseGcsUri(gcsUri);
      const bucket = this.storage.bucket(bucketName);
      const [buffer] = await bucket.file(path).download();
      const text = await this.pdfService.extractText(buffer);
      return await this.processDocument(document.id, text, 'application/pdf');
    } catch (error) {
      await this.prisma.document.update({
        where: { id: document.id },
        data: { status: 'FAILED', errorMessage: (error as Error).message },
      });
      throw error;
    }
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
    const chunks = this.chunkService.chunkText(text);
    if (!chunks.length) {
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'FAILED', errorMessage: 'No extractable text' },
      });
      throw new BadRequestException('No extractable text');
    }

    let embeddings: number[][] = [];
    if (this.embedService.isEnabled()) {
      this.logger.log(`Computing embeddings for ${chunks.length} chunks`);
      embeddings = await Promise.all(chunks.map((chunk) => this.embedService.embedText(chunk.content)));
    }

    const chunkData: Prisma.ChunkCreateManyInput[] = chunks.map((chunk, idx) => ({
      documentId,
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      contentHash: chunk.contentHash,
      startChar: chunk.startChar,
      endChar: chunk.endChar,
      embeddingJson: embeddings[idx] ? (embeddings[idx] as unknown as Prisma.InputJsonValue) : undefined,
    }));

    await this.prisma.$transaction([
      this.prisma.chunk.createMany({ data: chunkData }),
      this.prisma.document.update({
        where: { id: documentId },
        data: { status: 'READY', mimeType, errorMessage: null },
      }),
    ]);

    return { documentId, status: 'READY', chunks: chunks.length };
  }
}
