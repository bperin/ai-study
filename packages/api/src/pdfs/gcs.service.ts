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
        // Fall through to default authentication
      }
    }

    // Use default service account authentication (for Cloud Run)
    console.log('Using default service account authentication for GCS');
    this.storage = new Storage({
      projectId: this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID') || 'pro-pulsar-274402',
    });
    this.bucketName = this.configService.get<string>('GCP_BUCKET_NAME') ?? 'ai-study-uploads';
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
