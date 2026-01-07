import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'crypto';
import { DocumentsRepository } from '../documents/documents.repository';
import { GenAiService } from '../../shared/genai/genai.service';
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
    private readonly genAiService: GenAiService,
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

      void this.runLearningIntentPipeline({
        documentId: document.id,
        documentTitle: document.title || document.filename,
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

  private async runLearningIntentPipeline(params: { documentId: string; documentTitle: string; fileSearchStoreName?: string }) {
    if (!params.fileSearchStoreName) {
      this.logger.warn(`[Uploads] Missing File Search store for document ${params.documentId}. Skipping intent pipeline.`);
      return;
    }

    try {
      const analysis = await this.genAiService.analyzeDocumentForLearningIntents({
        fileSearchStoreName: params.fileSearchStoreName,
        documentTitle: params.documentTitle,
      });
      const analysisJson = this.parseJsonResponse(analysis.text);
      if (!analysisJson) {
        this.logger.warn(`[Uploads] Failed to parse intent analysis for document ${params.documentId}.`);
        return;
      }

      const intentsResponse = await this.genAiService.buildLearningIntents({
        analysis: JSON.stringify(analysisJson),
        documentTitle: params.documentTitle,
      });
      const intentsJson = this.parseJsonResponse(intentsResponse.text);
      const intents = intentsJson?.intents;

      if (!Array.isArray(intents) || intents.length === 0) {
        this.logger.warn(`[Uploads] No intents returned for document ${params.documentId}.`);
        return;
      }

      for (const intent of intents) {
        const artifactResponse = await this.genAiService.generateIntentQuestionArtifact({
          fileSearchStoreName: params.fileSearchStoreName,
          intentTitle: intent.title,
          intentDescription: intent.description,
          difficulty: intent.difficulty,
          questionCount: intent.questionCount,
        });
        const artifactJson = this.parseJsonResponse(artifactResponse.text);
        if (!artifactJson) {
          this.logger.warn(`[Uploads] Failed to parse question artifact for ${intent.title}.`);
          continue;
        }

        const evaluation = await this.genAiService.evaluateQuestionArtifact({
          artifactJson: JSON.stringify(artifactJson),
          fileSearchStoreName: params.fileSearchStoreName,
        });
        const evaluationJson = this.parseJsonResponse(evaluation.text);
        if (!evaluationJson?.approved) {
          this.logger.warn(`[Uploads] Intent ${intent.title} not approved. Skipping question generation.`);
          continue;
        }

        const questions = await this.genAiService.generateIntentQuestions({
          fileSearchStoreName: params.fileSearchStoreName,
          intentTitle: intent.title,
          intentDescription: intent.description,
          difficulty: intent.difficulty,
          questionCount: intent.questionCount,
        });
        const questionJson = this.parseJsonResponse(questions.text);
        if (!questionJson) {
          this.logger.warn(`[Uploads] Failed to parse final questions for ${intent.title}.`);
          continue;
        }

        this.logger.log(`[Uploads] Generated ${questionJson.questions?.length || 0} questions for ${intent.title}.`);
      }
    } catch (error: any) {
      this.logger.error(`[Uploads] Intent pipeline failed for document ${params.documentId}: ${error.message}`);
    }
  }

  private parseJsonResponse(text: string) {
    try {
      return JSON.parse(text);
    } catch (error) {
      return null;
    }
  }
}
