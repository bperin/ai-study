import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'crypto';
import { DocumentsRepository } from '../documents/documents.repository';
import { FileSearchService } from './file-search.service';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private storage: Storage;
  private bucketName: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly documentsRepository: DocumentsRepository,
    private readonly fileSearchService: FileSearchService,
  ) {
    this.storage = new Storage({
      projectId: this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID') || 'slap-ai-481400',
    });
    const bucketName = this.configService.get<string>('GCP_BUCKET_NAME') ?? 'missing-bucket';
    this.bucketName = bucketName.replace(/^-n\s+/, '').trim();
  }

  async generateUploadUrl(fileName: string, contentType: string, userId: string) {
    if (!this.bucketName || this.bucketName === 'missing-bucket') {
      throw new InternalServerErrorException('GCP_BUCKET_NAME is not set');
    }

    const sanitizedName = fileName.trim().replace(/[^a-zA-Z0-9.-]/g, '-');
    const filePath = `uploads/${userId}/${randomUUID()}-${sanitizedName}`;
    const expiresAt = Date.now() + 15 * 60 * 1000;

    const options = {
      version: 'v4' as const,
      action: 'write' as const,
      expires: expiresAt,
      contentType: contentType,
    };

    const [uploadUrl] = await this.storage.bucket(this.bucketName).file(filePath).getSignedUrl(options);

    return {
      uploadUrl,
      filePath,
      expiresAt: new Date(expiresAt).toISOString(),
      maxSizeBytes: 50 * 1024 * 1024,
    };
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
}
