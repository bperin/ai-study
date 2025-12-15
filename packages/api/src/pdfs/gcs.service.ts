import { Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GcsService {
  private storage: Storage;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    this.bucketName = this.configService.get<string>('GCP_BUCKET_NAME');
    if (!this.bucketName) {
      throw new Error('GCP_BUCKET_NAME environment variable is not set.');
    }

    const gcpSaKeyJson = this.configService.get<string>('GCP_SA_KEY');
    if (!gcpSaKeyJson) {
      throw new Error('GCP_SA_KEY is required for Google Cloud Storage authentication.');
    }

    try {
      const credentials = JSON.parse(gcpSaKeyJson);
      this.storage = new Storage({ credentials });
    } catch (error: unknown) {
      const errorMessage = (error instanceof Error) ? error.message : String(error);
      throw new Error(`Failed to parse GCP_SA_KEY JSON: ${errorMessage}`);
    }
  }

  async createSignedUploadUrl(
    fileName: string,
    contentType: string,
  ): Promise<{ url: string; signedUrl: string }> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(fileName);

    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: contentType,
    });

    const url = `https://storage.googleapis.com/${this.bucketName}/${fileName}`;
    return { url, signedUrl };
  }
}
