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

    // Use service account key if provided, otherwise fallback to default credentials
    const saKey = this.configService.get<string>('google.cloud.saKey');
    const projectId = this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID');
    
    const options: any = {
      projectId: projectId,
    };

    if (saKey) {
      try {
        // Try to parse as JSON string
        options.credentials = JSON.parse(saKey);
      } catch (e) {
        // If not JSON, assume it's a file path
        options.keyFilename = saKey;
      }
    }

    this.storage = new Storage(options);
  }

  /**
   * Download a file from Google Cloud Storage
   */
  async downloadFile(filePath: string): Promise<Buffer> {
    const file = this.storage.bucket(this.bucketName).file(filePath);
    const [buffer] = await file.download();
    return buffer;
  }

  async createSignedUploadUrl(fileName: string, contentType: string): Promise<{ url: string; signedUrl: string }> {
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

  /**
   * Get the bucket name
   */
  getBucketName(): string {
    return this.bucketName;
  }
}
