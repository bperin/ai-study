import { Injectable } from '@nestjs/common';
import { Document, DocumentSession } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class DocumentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createDocument(userId: string, filename: string, storagePath?: string | null, content?: string | null, mimeType?: string | null, subjectId?: string): Promise<Document> {
    return this.prisma.document.create({
      data: {
        filename,
        storagePath,
        mimeType,
        content,
        user: { connect: { id: userId } },
        ...(subjectId ? { subject: { connect: { id: subjectId } } } : {}),
      },
    });
  }

  async findDocumentById(id: string): Promise<Document | null> {
    return this.prisma.document.findUnique({ where: { id } });
  }

  async findDocumentForUser(id: string, userId: string): Promise<Document | null> {
    return this.prisma.document.findFirst({ where: { id, userId } });
  }

  async listUserDocumentsWithObjectives(userId: string, skip: number, take: number) {
    return this.prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        filename: true,
        storagePath: true,
        mimeType: true,
        ragStatus: true,
        ragFileName: true,
        storeId: true,
        fileId: true,
        createdAt: true,
        evals: {
          select: {
            title: true,
            difficulty: true,
            _count: {
              select: { items: true },
            },
          },
        },
      },
    });
  }

  async countUserDocuments(userId: string): Promise<number> {
    return this.prisma.document.count({ where: { userId } });
  }

  async listAllDocumentsWithObjectives(skip: number, take: number) {
    return this.prisma.document.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        filename: true,
        storagePath: true,
        mimeType: true,
        ragStatus: true,
        ragFileName: true,
        storeId: true,
        fileId: true,
        createdAt: true,
        evals: {
          select: {
            title: true,
            difficulty: true,
            _count: {
              select: { items: true },
            },
          },
        },
      },
    });
  }

  async countAllDocuments(): Promise<number> {
    return this.prisma.document.count();
  }

  async createDocumentSession(documentId: string, userId: string, status: 'generating' | 'completed' | 'failed', userPreferences?: any): Promise<DocumentSession> {
    return this.prisma.documentSession.create({
      data: {
        status,
        userPreferences,
        document: { connect: { id: documentId } },
        user: { connect: { id: userId } },
      },
    });
  }

  async updateDocumentSession(sessionId: string, status?: 'generating' | 'completed' | 'failed'): Promise<DocumentSession> {
    return this.prisma.documentSession.update({
      where: { id: sessionId },
      data: {
        status,
      },
    });
  }

  async deleteSessionsByDocument(documentId: string) {
    return this.prisma.documentSession.deleteMany({ where: { documentId } });
  }

  async deleteDocument(documentId: string) {
    return this.prisma.document.delete({ where: { id: documentId } });
  }

  async findSubjectById(id: string) {
    return this.prisma.subject.findUnique({ where: { id } });
  }

  async updateSubject(id: string, data: any) {
    return this.prisma.subject.update({
      where: { id },
      data,
    });
  }

  async updateDocument(documentId: string, data: any) {
    return this.prisma.document.update({
      where: { id: documentId },
      data,
    });
  }
}
