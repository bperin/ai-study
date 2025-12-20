import { Injectable } from '@nestjs/common';
import { TestAttempt, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseRepository } from './base.repository';

@Injectable()
export class TestAttemptRepository implements BaseRepository<TestAttempt, Prisma.TestAttemptCreateInput, Prisma.TestAttemptUpdateInput, Prisma.TestAttemptWhereInput> {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<TestAttempt | null> {
    return this.prisma.testAttempt.findUnique({
      where: { id },
    });
  }

  async findByIdWithPdf(id: string): Promise<any> {
    return this.prisma.testAttempt.findUnique({
      where: { id },
      include: { pdf: true },
    });
  }

  async findByIdWithAnswers(id: string): Promise<any> {
    return this.prisma.testAttempt.findUnique({
      where: { id },
      include: {
        answers: {
          include: { mcq: { include: { objective: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async findActiveByUserAndPdf(userId: string, pdfId: string): Promise<any> {
    return this.prisma.testAttempt.findFirst({
      where: {
        userId,
        pdfId,
        completedAt: null,
      },
      include: {
        answers: {
          include: { mcq: { include: { objective: true } } },
        },
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async findByUserWithStats(userId: string): Promise<any[]> {
    return this.prisma.testAttempt.findMany({
      where: { userId },
      include: {
        _count: {
          select: { answers: true },
        },
        pdf: {
          select: { filename: true },
        },
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async findMany(where?: Prisma.TestAttemptWhereInput, skip?: number, take?: number): Promise<TestAttempt[]> {
    return this.prisma.testAttempt.findMany({
      where,
      skip,
      take,
      orderBy: { startedAt: 'desc' },
    });
  }

  async create(data: Prisma.TestAttemptCreateInput): Promise<TestAttempt> {
    return this.prisma.testAttempt.create({
      data,
    });
  }

  async createWithAnswersIncluded(data: Prisma.TestAttemptCreateInput): Promise<any> {
    return this.prisma.testAttempt.create({
      data,
      include: {
        answers: {
          include: { mcq: { include: { objective: true } } },
        },
      },
    });
  }

  async update(id: string, data: Prisma.TestAttemptUpdateInput): Promise<TestAttempt> {
    return this.prisma.testAttempt.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<TestAttempt> {
    return this.prisma.testAttempt.delete({
      where: { id },
    });
  }

  async count(where?: Prisma.TestAttemptWhereInput): Promise<number> {
    return this.prisma.testAttempt.count({
      where,
    });
  }

  async markCompleted(id: string, percentage: number, totalQuestions: number): Promise<TestAttempt> {
    return this.prisma.testAttempt.update({
      where: { id },
      data: {
        percentage,
        total: totalQuestions,
        completedAt: new Date(),
      },
    });
  }

  async getCompletedAttempts(userId: string): Promise<any[]> {
    return this.prisma.testAttempt.findMany({
      where: {
        userId,
        completedAt: { not: null },
      },
      include: {
        pdf: {
          select: { filename: true },
        },
      },
      orderBy: { completedAt: 'desc' },
    });
  }

  async findAllWithStats(): Promise<any[]> {
    return this.prisma.testAttempt.findMany({
      include: {
        _count: {
          select: { answers: true },
        },
        pdf: {
          select: { filename: true },
        },
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async findByPdfWithStats(pdfId: string): Promise<any[]> {
    return this.prisma.testAttempt.findMany({
      where: { pdfId },
      include: {
        user: {
          select: { email: true },
        },
      },
      orderBy: { percentage: 'desc' },
    });
  }

  async findByIdWithStats(id: string): Promise<any> {
    return this.prisma.testAttempt.findUnique({
      where: { id },
      include: {
        _count: {
          select: { answers: true },
        },
        pdf: {
          select: { filename: true },
        },
        answers: {
          include: {
            mcq: {
              include: {
                objective: true,
              },
            },
          },
        },
        user: {
          select: { id: true, email: true },
        },
      },
    });
  }
}
