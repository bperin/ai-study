import { Injectable, InternalServerErrorException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'crypto';
import { PdfRepository } from '../shared/repositories/pdf.repository';
import { DocumentRepository } from '../shared/repositories/document.repository';
import { PdfTextService } from '../shared/services/pdf-text.service';
import { QueueService } from '../queue/queue.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class UploadsService {
  private storage: Storage;
  private bucketName: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly pdfRepository: PdfRepository,
    private readonly documentRepository: DocumentRepository,
    private readonly pdfTextService: PdfTextService,
    private readonly queueService: QueueService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    this.storage = new Storage({
      projectId: this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID') || 'slap-ai-481400',
    });
    const bucketName = this.configService.get<string>('GCP_BUCKET_NAME') ?? 'missing-bucket';
    // Clean up bucket name in case of copy-paste errors (e.g. " -n bucket-name")
    this.bucketName = bucketName.replace(/^-n\s+/, '').trim();
  }

  async generateUploadUrl(fileName: string, contentType: string, userId: string) {
    if (!this.bucketName || this.bucketName === 'missing-bucket') {
      throw new InternalServerErrorException('GCP_BUCKET_NAME is not set');
    }

    // Validate that the content type is PDF
    if (contentType !== 'application/pdf') {
      throw new InternalServerErrorException('Only PDF files are allowed');
    }

    // Sanitize filename and add user isolation
    const sanitizedName = fileName.trim().replace(/[^a-zA-Z0-9.-]/g, '-');
    const filePath = `uploads/${userId}/${randomUUID()}-${sanitizedName}`;
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    const options = {
      version: 'v4' as const,
      action: 'write' as const,
      expires: expiresAt,
      contentType: contentType,
    };

    // Get a v4 signed URL for uploading file
    const [uploadUrl] = await this.storage.bucket(this.bucketName).file(filePath).getSignedUrl(options);

    return {
      uploadUrl,
      filePath,
      expiresAt: new Date(expiresAt).toISOString(),
      maxSizeBytes: 50 * 1024 * 1024, // 50MB
    };
  }

  async confirmUpload(filePath: string, fileName: string, userId: string) {
    // Create PDF record in database
    this.logger.info('Creating PDF record', { fileName, filePath, userId });
    
    const pdf = await this.pdfRepository.create({
      filename: fileName,
      gcsPath: filePath,
      user: { connect: { id: userId } },
    });

    // Create document record for RAG
    const document = await this.documentRepository.create({
      title: fileName,
      sourceUri: `gcs://${this.bucketName}/${filePath}`,
      sourceType: 'PDF',
      status: 'PROCESSING',
    });

    // Queue PDF ingestion job
    const gcsUri = `gcs://${this.bucketName}/${filePath}`;
    const job = await this.queueService.addPdfIngestionJob({
      documentId: document.id,
      gcsUri,
      title: fileName,
      pdfId: pdf.id,
      userId,
    });

    // Store job ID on the PDF record for potential cancellation
    // @ts-ignore
    await this.pdfRepository.update(pdf.id, {
      ingestionJobId: job.id,
    });

    // Link PDF to document
    await this.pdfRepository.linkToDocument(pdf.id, document.id);

    return {
      id: pdf.id,
      filename: pdf.filename,
      userId: pdf.userId,
      documentId: document.id,
    };
  }
}
