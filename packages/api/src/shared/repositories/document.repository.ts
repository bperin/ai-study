import { Injectable } from '@nestjs/common';
import { Document, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseRepository } from './base.repository';

@Injectable()
export class DocumentRepository implements BaseRepository<Document, Prisma.DocumentCreateInput, Prisma.DocumentUpdateInput, Prisma.DocumentWhereInput> {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Document | null> {
    return this.prisma.document.findUnique({
      where: { id },
    });
  }

  async findBySourceUri(sourceUri: string): Promise<Document | null> {
    return this.prisma.document.findFirst({
      where: { sourceUri },
    });
  }

  async findWithChunks(id: string): Promise<(Document & { chunks: any[] }) | null> {
    return this.prisma.document.findUnique({
      where: { id },
      include: {
        chunks: {
          orderBy: { chunkIndex: 'asc' },
        },
      },
    });
  }

  async findMany(where?: Prisma.DocumentWhereInput, skip?: number, take?: number): Promise<Document[]> {
    return this.prisma.document.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: Prisma.DocumentCreateInput): Promise<Document> {
    return this.prisma.document.create({
      data,
    });
  }

  async update(id: string, data: Prisma.DocumentUpdateInput): Promise<Document> {
    return this.prisma.document.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Document> {
    return this.prisma.document.delete({
      where: { id },
    });
  }

  async count(where?: Prisma.DocumentWhereInput): Promise<number> {
    return this.prisma.document.count({
      where,
    });
  }

  async updateStatus(id: string, status: string, errorMessage?: string): Promise<Document> {
    return this.prisma.document.update({
      where: { id },
      data: {
        status,
        errorMessage,
      },
    });
  }

  async findByStatus(status: string): Promise<Document[]> {
    return this.prisma.document.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByGcsUrisOrTitles(gcsUris: string[], titles: string[]): Promise<any[]> {
    return this.prisma.document.findMany({
      where: {
        OR: [
          { sourceUri: { in: gcsUris } },
          { title: { in: titles } },
        ],
      },
    });
  }

  async findBySourceType(sourceType: string): Promise<any[]> {
    return this.prisma.document.findMany({
      where: { sourceType: sourceType as any },
      select: { id: true, title: true },
    });
  }

  async deleteChunksByDocumentId(documentId: string): Promise<number> {
    const result = await this.prisma.chunk.deleteMany({
      where: { documentId },
    });
    return result.count;
  }

  async createChunk(data: any): Promise<any> {
    return this.prisma.chunk.create({
      data,
    });
  }

  async createChunkWithVector(data: any): Promise<any> {
    return this.prisma.$executeRawUnsafe(
      `INSERT INTO "Chunk" ("id", "documentId", "chunkIndex", "content", "contentHash", "startChar", "endChar", "embeddingJson", "embeddingVec")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::vector)`,
      data.id,
      data.documentId,
      data.chunkIndex,
      data.content,
      data.contentHash,
      data.startChar,
      data.endChar,
      data.embeddingJson,
      data.embeddingSql,
    );
  }

  async countChunksByDocumentId(documentId: string): Promise<number> {
    return this.prisma.chunk.count({
      where: { documentId },
    });
  }

  async findChunksByDocumentId(documentId: string, skip?: number, take?: number): Promise<any[]> {
    return this.prisma.chunk.findMany({
      where: { documentId },
      orderBy: { chunkIndex: 'asc' },
      skip,
      take,
    });
  }

  async createQueryLog(data: any): Promise<any> {
    return this.prisma.queryLog.create({
      data,
    });
  }

  async queryRawVectorSimilarity(chunks: any[], vectorString: string, topK: number): Promise<any[]> {
    const { Prisma } = require('@prisma/client');
    return this.prisma.$queryRaw<any[]>`
      SELECT 
        id, 
        "documentId", 
        "chunkIndex", 
        "content", 
        "contentHash", 
        "startChar", 
        "endChar", 
        "embeddingJson", 
        "createdAt",
        (1 - ("embeddingVec" <=> ${Prisma.raw(`'${vectorString}'`)}::vector)) as score
      FROM "Chunk"
      WHERE "documentId" = ${chunks[0].documentId}
      ORDER BY score DESC
      LIMIT ${topK * 2}
    `;
  }
}
