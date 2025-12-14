import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';

@Injectable()
export class GcsService {
  private storage: Storage;
  private bucketName: string;

  constructor(private readonly configService: ConfigService) {
    const serviceAccountKey = this.configService.get<string>('GCP_SA_KEY');

    if (serviceAccountKey) {
      // Parse the service account JSON key
      try {
        const credentials = JSON.parse(serviceAccountKey);
        this.storage = new Storage({
          projectId: credentials.project_id,
          credentials: credentials,
        });
        this.bucketName = this.configService.get<string>('GCP_BUCKET_NAME') ?? 'missing-bucket';
        return;
      } catch (error) {
        console.error('Failed to parse GCP_SA_KEY:', error);
        throw new Error('Invalid GCP_SA_KEY format. Please provide a valid service account JSON key.');
      }
    }

    throw new Error('GCP_SA_KEY is required for Google Cloud Storage authentication.');
  }

  /**
   * Download a file from Google Cloud Storage
   */
  async downloadFile(filePath: string): Promise<Buffer> {
    const file = this.storage.bucket(this.bucketName).file(filePath);
    const [buffer] = await file.download();
    return buffer;
  }

  /**
   * Get the bucket name
   */
  getBucketName(): string {
    return this.bucketName;
  }
}
