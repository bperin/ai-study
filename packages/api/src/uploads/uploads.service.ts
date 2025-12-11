import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UploadsService {
  private storage: Storage;
  private bucketName: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const projectId = this.configService.get<string>('GCP_PROJECT_ID');
    const clientEmail = this.configService.get<string>('GCP_CLIENT_EMAIL');
    const privateKey = this.resolvePrivateKey();

    this.storage = new Storage({
      projectId,
      credentials:
        clientEmail && privateKey
          ? {
            client_email: clientEmail,
            private_key: privateKey,
          }
          : undefined,
    });

    this.bucketName =
      this.configService.get<string>('GCP_BUCKET_NAME') ?? 'missing-bucket';
  }

  private resolvePrivateKey(): string | undefined {
    const rawKey = this.configService.get<string>('GCP_PRIVATE_KEY');
    if (rawKey) {
      return rawKey.replace(/\\n/g, '\n');
    }

    const base64Key = this.configService.get<string>('GCP_PRIVATE_KEY_BASE64');
    if (base64Key) {
      return Buffer.from(base64Key, 'base64').toString('utf8');
    }

    return undefined;
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
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(filePath);

    // Generate signed URL with additional security constraints
    const [uploadUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: expiresAt,
      contentType,
    });

    return {
      uploadUrl,
      filePath,
      expiresAt: new Date(expiresAt).toISOString(),
      maxSizeBytes: 10485760, // 10MB in bytes (enforce client-side)
    };
  }

  async confirmUpload(filePath: string, fileName: string, userId: string) {
    // Save PDF metadata to database
    const pdf = await this.prisma.pdf.create({
      data: {
        filename: fileName,
        userId: userId,
        content: filePath, // Store GCS path in content field for now
      },
    });

    return {
      id: pdf.id,
      filename: pdf.filename,
      createdAt: pdf.createdAt,
      message: 'PDF uploaded successfully',
    };
  }
}
