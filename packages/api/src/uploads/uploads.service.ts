import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'crypto';

@Injectable()
export class UploadsService {
  private storage: Storage;
  private bucketName: string;

  constructor(private readonly configService: ConfigService) {
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

  async generateUploadUrl(fileName: string, contentType: string) {
    if (!this.bucketName || this.bucketName === 'missing-bucket') {
      throw new InternalServerErrorException('GCP_BUCKET_NAME is not set');
    }

    const sanitizedName = fileName.trim().replace(/\s+/g, '-');
    const filePath = `uploads/${randomUUID()}-${sanitizedName}`;
    const expiresAt = Date.now() + 10 * 60 * 1000;

    const bucket = this.storage.bucket(this.bucketName);
    const [uploadUrl] = await bucket.file(filePath).getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: expiresAt,
      contentType,
    });

    return {
      uploadUrl,
      filePath,
      expiresAt: new Date(expiresAt).toISOString(),
    };
  }
}
