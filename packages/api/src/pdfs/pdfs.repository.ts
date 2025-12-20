import { Injectable } from '@nestjs/common';
import { Pdf, PdfSession } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePdfRecordDto } from './dto/create-pdf-record.dto';
import { CreatePdfSessionDto } from './dto/create-pdf-session.dto';
import { UpdatePdfSessionDto } from './dto/update-pdf-session.dto';

@Injectable()
export class PdfsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createPdf(data: CreatePdfRecordDto): Promise<Pdf> {
    return this.prisma.pdf.create({ data });
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

  async createPdfSession(data: CreatePdfSessionDto): Promise<PdfSession> {
    return this.prisma.pdfSession.create({ data });
  }

  async updatePdfSession(sessionId: string, data: UpdatePdfSessionDto): Promise<PdfSession> {
    return this.prisma.pdfSession.update({
      where: { id: sessionId },
      data,
    });
  }

  async deleteSessionsByPdf(pdfId: string) {
    return this.prisma.pdfSession.deleteMany({ where: { pdfId } });
  }

  async deletePdf(pdfId: string) {
    return this.prisma.pdf.delete({ where: { id: pdfId } });
  }
}
