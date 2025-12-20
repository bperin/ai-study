import { Injectable } from '@nestjs/common';
import { Chunk, Document, QueryLog } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentIdentifierDto } from './dto/document-identifier.dto';

@Injectable()
export class RagRepository {
  constructor(private readonly prisma: PrismaService) {}

  createDocumentRecord(title: string | null | undefined, sourceType: string, sourceUri: string | null | undefined, mimeType: string, status: string): Promise<Document> {
    return this.prisma.document.create({
      data: {
        title: title ?? null,
        sourceType,
        sourceUri: sourceUri ?? null,
        mimeType,
        status,
      },
    });
  }

  updateDocumentById(documentId: string, status?: string, errorMessage?: string | null, mimeType?: string | null): Promise<Document> {
    const payload: Record<string, any> = {};
    if (status !== undefined) payload.status = status;
    if (errorMessage !== undefined) payload.errorMessage = errorMessage;
    if (mimeType !== undefined) payload.mimeType = mimeType;

    return this.prisma.document.update({ where: { id: documentId }, data: payload });
  }

  findDocumentById(id: string): Promise<Document | null> {
    return this.prisma.document.findUnique({ where: { id } });
  }

  async findDocumentByIdentifiers(identifiers: DocumentIdentifierDto[], statusFilter?: string[]): Promise<Document | null> {
    const filters = identifiers
      .map((identifier) => {
        const clauses: any[] = [];
        if (identifier.sourceUri) {
          clauses.push({ sourceUri: { contains: identifier.sourceUri } });
        }
        if (identifier.title) {
          clauses.push({ title: { equals: identifier.title, mode: 'insensitive' } });
        }
        return clauses.length ? { AND: clauses } : null;
      })
      .filter(Boolean);

    if (!filters.length) {
      return null;
    }

    return this.prisma.document.findFirst({
      where: {
        OR: filters as any,
        ...(statusFilter?.length ? { status: { in: statusFilter } } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findDocumentsForSources(filenames: string[], gcsUris: string[]): Promise<Array<Pick<Document, 'sourceUri' | 'title' | 'status'>>> {
    if (!filenames.length && !gcsUris.length) {
      return [];
    }

    const orClauses: any[] = [];
    if (gcsUris.length) {
      orClauses.push({ sourceUri: { in: gcsUris } });
    }
    if (filenames.length) {
      orClauses.push({ title: { in: filenames } });
    }

    return this.prisma.document.findMany({
      where: { OR: orClauses },
      select: { sourceUri: true, title: true, status: true },
    });
  }

  listGcsDocuments(): Promise<Array<Pick<Document, 'id' | 'title'>>> {
    return this.prisma.document.findMany({
      where: { sourceType: 'gcs' },
      select: { id: true, title: true },
    });
  }

  createChunkRecord(documentId: string, chunkIndex: number, content: string, contentHash: string, startChar: number, endChar: number, embeddingJson?: number[] | null, id?: string) {
    return this.prisma.chunk.create({
      data: {
        id,
        documentId,
        chunkIndex,
        content,
        contentHash,
        startChar,
        endChar,
        embeddingJson: (embeddingJson ?? null) as any,
      },
    });
  }

  deleteChunksByDocument(documentId: string) {
    return this.prisma.chunk.deleteMany({ where: { documentId } });
  }

  listChunksByDocument(documentId: string, options?: { skip?: number; take?: number }): Promise<Chunk[]> {
    return this.prisma.chunk.findMany({
      where: { documentId },
      orderBy: { chunkIndex: 'asc' },
      skip: options?.skip,
      take: options?.take,
    });
  }

  countChunksByDocument(documentId: string): Promise<number> {
    return this.prisma.chunk.count({ where: { documentId } });
  }

  createQueryLogEntry(documentId: string, question: string, answer: string, model: string, topK: number, usedChunks: any, latencyMs?: number): Promise<QueryLog> {
    return this.prisma.queryLog.create({
      data: {
        documentId,
        question,
        answer,
        model,
        topK,
        usedChunks,
        latencyMs,
      },
    });
  }

  vectorSearch(vectorSql: string, documentId: string, limit: number): Promise<any[]> {
    return this.prisma.$queryRawUnsafe(
      `SELECT id, "documentId", "chunkIndex", "content", "contentHash", "startChar", "endChar", "embeddingJson", "createdAt",
              (1 - ("embeddingVec" <=> $1::vector)) as score
       FROM "Chunk"
       WHERE "documentId" = $2
       ORDER BY score DESC
       LIMIT $3`,
      vectorSql,
      documentId,
      limit,
    );
  }

  async insertChunkWithVector(id: string, documentId: string, chunkIndex: number, content: string, contentHash: string, startChar: number, endChar: number, embeddingJson: number[] | null, embeddingSql: string) {
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "Chunk" ("id", "documentId", "chunkIndex", "content", "contentHash", "startChar", "endChar", "embeddingJson", "embeddingVec")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::vector)`,
      id,
      documentId,
      chunkIndex,
      content,
      contentHash,
      startChar,
      endChar,
      JSON.stringify(embeddingJson),
      embeddingSql,
    );
  }

  async findChunksForDocumentLookup(pdfFilename: string, gcsPath: string): Promise<Chunk[]> {
    const normalizedPath = gcsPath?.replace('gcs://', '') || '';

    const document = await this.prisma.document.findFirst({
      where: {
        OR: [gcsPath ? { sourceUri: { contains: gcsPath } } : undefined, normalizedPath ? { sourceUri: { contains: normalizedPath } } : undefined, pdfFilename ? { title: { equals: pdfFilename, mode: 'insensitive' } } : undefined].filter(Boolean) as any,
      },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!document) {
      return [];
    }

    return this.prisma.chunk.findMany({
      where: { documentId: document.id },
      orderBy: { chunkIndex: 'asc' },
    });
  }
}
