import { Injectable } from '@nestjs/common';
import { Artifact, ArtifactStatus, ArtifactType, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { 
  IArtifactRepository, 
  CreateArtifactDto, 
  UpdateArtifactDto, 
  FindArtifactsOptions 
} from './interfaces/artifact.repository.interface';

@Injectable()
export class ArtifactsRepository implements IArtifactRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateArtifactDto): Promise<Artifact> {
    return this.prisma.artifact.create({
      data: {
        type: data.type,
        status: data.status || ArtifactStatus.PENDING,
        userId: data.userId,
        documentId: data.documentId,
        evalId: data.evalId,
        evalItemId: data.evalItemId,
        attemptId: data.attemptId,
        mimeType: data.mimeType,
        storageUri: data.storageUri,
        text: data.text,
        json: data.json as Prisma.JsonValue,
        model: data.model,
        prompt: data.prompt,
        inputHash: data.inputHash,
        meta: data.meta as Prisma.JsonValue,
      },
    });
  }

  async findById(id: string): Promise<Artifact | null> {
    return this.prisma.artifact.findUnique({
      where: { id },
    });
  }

  async update(id: string, data: UpdateArtifactDto): Promise<Artifact> {
    return this.prisma.artifact.update({
      where: { id },
      data: {
        status: data.status,
        text: data.text,
        json: data.json as Prisma.JsonValue,
        storageUri: data.storageUri,
        error: data.error,
        meta: data.meta as Prisma.JsonValue,
        updatedAt: new Date(),
      },
    });
  }

  async delete(id: string): Promise<Artifact> {
    return this.prisma.artifact.delete({
      where: { id },
    });
  }

  async findMany(options: FindArtifactsOptions): Promise<Artifact[]> {
    const where: Prisma.ArtifactWhereInput = {};

    if (options.type) where.type = options.type;
    if (options.status) where.status = options.status;
    if (options.documentId) where.documentId = options.documentId;
    if (options.evalId) where.evalId = options.evalId;
    if (options.evalItemId) where.evalItemId = options.evalItemId;
    if (options.attemptId) where.attemptId = options.attemptId;
    if (options.userId) where.userId = options.userId;

    return this.prisma.artifact.findMany({
      where,
      skip: options.skip,
      take: options.take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findLatestByType(
    type: ArtifactType, 
    documentId?: string, 
    evalId?: string, 
    evalItemId?: string, 
    attemptId?: string
  ): Promise<Artifact | null> {
    const where: Prisma.ArtifactWhereInput = { type };

    if (documentId) where.documentId = documentId;
    if (evalId) where.evalId = evalId;
    if (evalItemId) where.evalItemId = evalItemId;
    if (attemptId) where.attemptId = attemptId;

    return this.prisma.artifact.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async countByType(
    type: ArtifactType, 
    documentId?: string, 
    evalId?: string
  ): Promise<number> {
    const where: Prisma.ArtifactWhereInput = { type };

    if (documentId) where.documentId = documentId;
    if (evalId) where.evalId = evalId;

    return this.prisma.artifact.count({ where });
  }
}
