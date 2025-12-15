import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { PdfTextService } from '../pdfs/pdf-text.service';
import { IngestService } from '../rag/services/ingest.service';

@Injectable()
export class UploadsService {
  private storage: Storage;
  private bucketName: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly pdfTextService: PdfTextService,
    private readonly ingestService: IngestService,
  ) {
    this.storage = new Storage({
      projectId:
        this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID') ||
        'slap-ai-481400',
    });
    const bucketName =
      this.configService.get<string>('GCP_BUCKET_NAME') ?? 'missing-bucket';
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
    // Save PDF metadata to database
    const pdf = await this.prisma.pdf.create({
      data: {
        filename: fileName,
        userId: userId,
        gcsPath: filePath, // Store GCS path
      },
    });

    // Trigger RAG ingestion
    (async () => {
      try {
        console.log(`[RAG Ingestion] Starting for PDF ${pdf.id}: ${fileName}`);
        const gcsUri = `gcs://${this.bucketName}/${filePath}`;
        await this.ingestService.createFromGcs(fileName, gcsUri);
        console.log(`[RAG Ingestion] Successfully completed for PDF ${pdf.id}`);
      } catch (error: any) {
        console.error(`[RAG Ingestion] Failed to ingest document for RAG (PDF ${pdf.id}): ${error.message}`);
        if (error.stack) console.error(error.stack);
      }
    })().catch(err => {
      console.error(`[RAG Ingestion] Fatal error in async ingestion task:`, err);
    });

    return {
      id: pdf.id,
      filename: pdf.filename,
      userId: pdf.userId,
    };
  }
}
