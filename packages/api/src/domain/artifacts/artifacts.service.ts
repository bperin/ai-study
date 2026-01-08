import { Injectable, Logger } from '@nestjs/common';
import { Artifact, ArtifactStatus, ArtifactType } from '@prisma/client';
import { ArtifactsRepository } from './artifacts.repository';
import { CreateArtifactDto, UpdateArtifactDto, FindArtifactsOptions } from './interfaces/artifact.repository.interface';
import { createHash } from 'crypto';

@Injectable()
export class ArtifactsService {
  private readonly logger = new Logger(ArtifactsService.name);

  constructor(private readonly artifactsRepository: ArtifactsRepository) {}

  /**
   * Create a new artifact
   */
  async createArtifact(data: CreateArtifactDto): Promise<Artifact> {
    // Generate input hash if not provided
    if (!data.inputHash && (data.prompt || data.text)) {
      const input = data.prompt || data.text || '';
      data.inputHash = this.generateInputHash(input);
    }

    this.logger.debug(`Creating ${data.type} artifact${data.documentId ? ` for document ${data.documentId}` : ''}`);
    return this.artifactsRepository.create(data);
  }

  /**
   * Store document intents as an artifact
   */
  async storeDocumentIntents(documentId: string, userId: string, intents: any, model?: string, prompt?: string): Promise<Artifact> {
    return this.createArtifact({
      type: ArtifactType.INTENTS,
      status: ArtifactStatus.READY,
      documentId,
      userId,
      json: intents,
      model,
      prompt,
    });
  }

  /**
   * Get the latest intents for a document
   */
  async getDocumentIntents(documentId: string): Promise<any | null> {
    const artifact = await this.artifactsRepository.findLatestByType(ArtifactType.INTENTS, documentId);
    return artifact?.json || null;
  }

  /**
   * Update an artifact
   */
  async updateArtifact(id: string, data: UpdateArtifactDto): Promise<Artifact> {
    return this.artifactsRepository.update(id, data);
  }

  /**
   * Find artifact by ID
   */
  async findArtifactById(id: string): Promise<Artifact | null> {
    return this.artifactsRepository.findById(id);
  }

  /**
   * Find artifacts by criteria
   */
  async findArtifacts(options: FindArtifactsOptions): Promise<Artifact[]> {
    return this.artifactsRepository.findMany(options);
  }

  /**
   * Find the latest artifact of a specific type
   */
  async findLatestArtifactByType(type: ArtifactType, documentId?: string, evalId?: string, evalItemId?: string, attemptId?: string): Promise<Artifact | null> {
    return this.artifactsRepository.findLatestByType(type, documentId, evalId, evalItemId, attemptId);
  }

  /**
   * Mark an artifact as failed
   */
  async markArtifactAsFailed(id: string, error: string): Promise<Artifact> {
    return this.artifactsRepository.update(id, {
      status: ArtifactStatus.FAILED,
      error,
    });
  }

  /**
   * Mark an artifact as ready
   */
  async markArtifactAsReady(id: string, data?: Partial<UpdateArtifactDto>): Promise<Artifact> {
    return this.artifactsRepository.update(id, {
      status: ArtifactStatus.READY,
      ...data,
    });
  }

  /**
   * Generate a hash for input deduplication
   */
  private generateInputHash(input: string): string {
    return createHash('sha256').update(input).digest('hex').substring(0, 16);
  }
}
