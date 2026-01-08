import { Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';

@Injectable()
export class GcsService {
  private storage: Storage;
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.GCP_BUCKET_NAME || '';
    if (!this.bucketName) {
      throw new Error('GCP_BUCKET_NAME environment variable is not set.');
    }

    const saKey = process.env.GOOGLE_CLOUD_SA_KEY;
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
    const options: any = { projectId };

    if (saKey) {
      try {
        options.credentials = JSON.parse(saKey);
      } catch (e) {
        options.keyFilename = saKey;
      }
    }

    this.storage = new Storage(options);
  }

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
  getBucketName(): string {
    return this.bucketName;
  }
}
