import { Injectable } from '@nestjs/common';
import { Pdf, PdfSession, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class PdfsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createPdf(userId: string, filename: string, gcsPath?: string | null, content?: string | null): Promise<Pdf> {
    return this.prisma.pdf.create({
      data: {
        filename,
        gcsPath,
        content,
        user: { connect: { id: userId } },
      },
    });
  }

  async findPdfById(id: string): Promise<Pdf | null> {
    return this.prisma.pdf.findUnique({ where: { id } });
  }

  async findPdfForUser(id: string, userId: string): Promise<Pdf | null> {
    return this.prisma.pdf.findFirst({ where: { id, userId } });
  }

  async listUserPdfsWithObjectives(userId: string, skip: number, take: number) {
    return this.prisma.pdf.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        filename: true,
        gcsPath: true,
        createdAt: true,
        objectives: {
          select: {
            title: true,
            difficulty: true,
            _count: {
              select: { mcqs: true },
            },
          },
        },
      },
    });
  }

  async countUserPdfs(userId: string): Promise<number> {
    return this.prisma.pdf.count({ where: { userId } });
  }

  async listAllPdfsWithObjectives(skip: number, take: number) {
    return this.prisma.pdf.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        filename: true,
        gcsPath: true,
        createdAt: true,
        objectives: {
          select: {
            title: true,
            difficulty: true,
            _count: {
              select: { mcqs: true },
            },
          },
        },
      },
    });
  }

  async countAllPdfs(): Promise<number> {
    return this.prisma.pdf.count();
  }

  async createPdfSession(pdfId: string, userId: string, status: 'generating' | 'completed' | 'failed', userPreferences?: any): Promise<PdfSession> {
    return this.prisma.pdfSession.create({
      data: {
        status,
        userPreferences,
        pdf: { connect: { id: pdfId } },
        user: { connect: { id: userId } },
      },
    });
  }

  async updatePdfSession(sessionId: string, status?: 'generating' | 'completed' | 'failed'): Promise<PdfSession> {
    return this.prisma.pdfSession.update({
      where: { id: sessionId },
      data: {
        status,
      },
    });
  }

  async deleteSessionsByPdf(pdfId: string) {
    return this.prisma.pdfSession.deleteMany({ where: { pdfId } });
  }

  async deletePdf(pdfId: string) {
    return this.prisma.pdf.delete({ where: { id: pdfId } });
  }
}
