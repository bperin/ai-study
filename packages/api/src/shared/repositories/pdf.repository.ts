import { Injectable } from '@nestjs/common';
import { Pdf, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseRepository } from './base.repository';

@Injectable()
export class PdfRepository implements BaseRepository<Pdf, Prisma.PdfCreateInput, Prisma.PdfUpdateInput, Prisma.PdfWhereInput> {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Pdf | null> {
    return this.prisma.pdf.findUnique({
      where: { id },
    });
  }

  async findByUserIdSimple(userId: string): Promise<Pdf[]> {
    return this.prisma.pdf.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findWithDocument(id: string): Promise<(Pdf & { document?: any }) | null> {
    return this.prisma.pdf.findUnique({
      where: { id },
      include: {
        document: {
          select: {
            id: true,
            status: true,
            errorMessage: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: { chunks: true },
            },
          },
        },
      },
    });
  }

  async findMany(where?: Prisma.PdfWhereInput, skip?: number, take?: number): Promise<Pdf[]> {
    return this.prisma.pdf.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: Prisma.PdfCreateInput): Promise<Pdf> {
    return this.prisma.pdf.create({
      data,
    });
  }

  async update(id: string, data: Prisma.PdfUpdateInput): Promise<Pdf> {
    return this.prisma.pdf.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Pdf> {
    return this.prisma.pdf.delete({
      where: { id },
    });
  }

  async count(where?: Prisma.PdfWhereInput): Promise<number> {
    return this.prisma.pdf.count({
      where,
    });
  }

  async linkToDocument(id: string, documentId: string): Promise<Pdf> {
    return this.prisma.pdf.update({
      where: { id },
      data: { documentId },
    });
  }

  async findByUserId(userId: string, skip?: number, take?: number): Promise<Pdf[]> {
    return this.prisma.pdf.findMany({
      where: { userId },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async countByUserId(userId: string): Promise<number> {
    return this.prisma.pdf.count({
      where: { userId },
    });
  }

  async findAll(skip?: number, take?: number): Promise<Pdf[]> {
    return this.prisma.pdf.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAttemptsByPdfIds(pdfIds: string[]): Promise<any[]> {
    return this.prisma.testAttempt.findMany({
      where: { pdfId: { in: pdfIds } },
      include: {
        user: {
          select: { email: true },
        },
      },
    });
  }

  async deleteUserAnswersByPdfId(pdfId: string): Promise<number> {
    const result = await this.prisma.userAnswer.deleteMany({
      where: {
        attempt: {
          pdfId: pdfId,
        },
      },
    });
    return result.count;
  }

  async deleteAttemptsByPdfId(pdfId: string): Promise<number> {
    const result = await this.prisma.testAttempt.deleteMany({
      where: { pdfId },
    });
    return result.count;
  }

  async deleteSessionsByPdfId(pdfId: string): Promise<number> {
    // Assuming there's a session table - if not, this can return 0
    return 0;
  }
}
