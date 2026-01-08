import { Injectable, Logger } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { DocumentsRepository } from '../documents/documents.repository';
import { FileSearchService } from './file-search.service';
import { DocumentIntentService } from '../../genai/services/document-intent.service';

@Injectable()
export class GcsService {
  private storage: Storage;
  private bucketName: string;
  private readonly logger = new Logger(GcsService.name);

  constructor(
    private readonly documentsRepository: DocumentsRepository,
    private readonly fileSearchService: FileSearchService,
    private readonly documentIntentService: DocumentIntentService,
  ) {
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

  async confirmUpload(filePath: string, fileName: string, userId: string, subjectId?: string) {
    const document = await this.documentsRepository.createDocument(userId, fileName, filePath, null, null, subjectId);

    let mimeType: string | undefined;

    try {
      const gcsObject = this.storage.bucket(this.bucketName).file(filePath);
      const [metadata] = await gcsObject.getMetadata();
      mimeType = metadata?.contentType;
    } catch (error: any) {
      this.logger.warn(`Failed to process document metadata for ${document.id}: ${error.message}`);
    }

    try {
      let existingStoreId: string | undefined;
      if (subjectId) {
        const subject = await this.documentsRepository.findSubjectById(subjectId);
        if (subject?.storeId) {
          existingStoreId = subject.storeId;
        }
      }

      const uploadResult = await this.fileSearchService.uploadFromGcs(filePath, fileName, existingStoreId);

      // If we created a new store and have a subject, save the storeId on the subject
      if (subjectId && !existingStoreId && uploadResult.storeId) {
        await this.documentsRepository.updateSubject(subjectId, { storeId: uploadResult.storeId });
      }

      await this.documentsRepository.updateDocument(document.id, {
        fileId: uploadResult.fileId,
        ragFileName: uploadResult.displayName || fileName,
        storeId: uploadResult.storeId,
        ragStatus: uploadResult.state || 'ACTIVE',
        mimeType: mimeType || 'application/pdf',
        storagePath: filePath,
      });

      // Run the learning intent pipeline
      void this.runLearningIntentPipeline({
        documentId: document.id,
        documentTitle: document.title || document.filename,
        userId: document.userId,
        fileSearchStoreName: uploadResult.storeId,
      });
    } catch (error: any) {
      this.logger.error(`Failed to upload document ${document.id} to Gemini File Search: ${error.message}`);
      await this.documentsRepository.updateDocument(document.id, {
        ragStatus: 'FAILED',
        storagePath: filePath,
        mimeType: mimeType || 'application/pdf',
      });
    }

    return {
      id: document.id,
      filename: document.filename,
      userId: document.userId,
      subjectId: (document as any).subjectId,
    };
  }

  /**
   * Run the learning intent extraction pipeline
   */
  private async runLearningIntentPipeline(params: { documentId: string; documentTitle: string; userId: string; fileSearchStoreName?: string }): Promise<void> {
    try {
      await this.documentIntentService.extractDocumentIntents(params);
      this.logger.log(`Successfully extracted intents for document ${params.documentId}`);
    } catch (error) {
      this.logger.error(`Failed to run intent pipeline for document ${params.documentId}: ${error.message}`);
    }
  }

  getBucketName(): string {
    return this.bucketName;
  }
}
