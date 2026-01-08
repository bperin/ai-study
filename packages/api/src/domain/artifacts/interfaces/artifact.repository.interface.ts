import { Artifact, ArtifactStatus, ArtifactType } from '@prisma/client';

export interface CreateArtifactDto {
  type: ArtifactType;
  status?: ArtifactStatus;
  userId?: string;
  documentId?: string;
  evalId?: string;
  evalItemId?: string;
  attemptId?: string;
  mimeType?: string;
  storageUri?: string;
  text?: string;
  json?: any;
  model?: string;
  prompt?: string;
  inputHash?: string;
  meta?: any;
}

export interface UpdateArtifactDto {
  status?: ArtifactStatus;
  text?: string;
  json?: any;
  storageUri?: string;
  error?: string;
  meta?: any;
}

export interface FindArtifactsOptions {
  type?: ArtifactType;
  status?: ArtifactStatus;
  documentId?: string;
  evalId?: string;
  evalItemId?: string;
  attemptId?: string;
  userId?: string;
  skip?: number;
  take?: number;
}

export interface IArtifactRepository {
  create(data: CreateArtifactDto): Promise<Artifact>;
  findById(id: string): Promise<Artifact | null>;
  update(id: string, data: UpdateArtifactDto): Promise<Artifact>;
  delete(id: string): Promise<Artifact>;
  findMany(options: FindArtifactsOptions): Promise<Artifact[]>;
  findLatestByType(type: ArtifactType, documentId?: string, evalId?: string, evalItemId?: string, attemptId?: string): Promise<Artifact | null>;
  countByType(type: ArtifactType, documentId?: string, evalId?: string): Promise<number>;
}
