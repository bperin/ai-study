import { Injectable } from '@nestjs/common';
import { UserAnswer, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseRepository } from './base.repository';

@Injectable()
export class UserAnswerRepository implements BaseRepository<UserAnswer, Prisma.UserAnswerCreateInput, Prisma.UserAnswerUpdateInput, Prisma.UserAnswerWhereInput> {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserAnswer | null> {
    return this.prisma.userAnswer.findUnique({
      where: { id },
    });
  }

  async findByAttemptId(attemptId: string): Promise<UserAnswer[]> {
    return this.prisma.userAnswer.findMany({
      where: { attemptId },
      include: { mcq: { include: { objective: true } } },
    });
  }

  async findByAttemptAndMcq(attemptId: string, mcqId: string): Promise<UserAnswer | null> {
    return this.prisma.userAnswer.findFirst({
      where: { attemptId, mcqId },
    });
  }

  async findMany(where?: Prisma.UserAnswerWhereInput, skip?: number, take?: number): Promise<UserAnswer[]> {
    return this.prisma.userAnswer.findMany({
      where,
      skip,
      take,
    });
  }

  async create(data: Prisma.UserAnswerCreateInput): Promise<UserAnswer> {
    return this.prisma.userAnswer.create({
      data,
    });
  }

  async update(id: string, data: Prisma.UserAnswerUpdateInput): Promise<UserAnswer> {
    return this.prisma.userAnswer.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<UserAnswer> {
    return this.prisma.userAnswer.delete({
      where: { id },
    });
  }

  async count(where?: Prisma.UserAnswerWhereInput): Promise<number> {
    return this.prisma.userAnswer.count({
      where,
    });
  }

  async createMany(data: { data: Prisma.UserAnswerCreateManyInput[] }): Promise<{ count: number }> {
    return this.prisma.userAnswer.createMany(data);
  }

  async countCorrectByAttempt(attemptId: string): Promise<number> {
    return this.prisma.userAnswer.count({
      where: {
        attemptId,
        isCorrect: true,
      },
    });
  }

  async deleteByAttemptId(attemptId: string): Promise<number> {
    const result = await this.prisma.userAnswer.deleteMany({
      where: { attemptId },
    });
    return result.count;
  }

  async findWithMcqDetails(attemptId: string): Promise<any[]> {
    return this.prisma.userAnswer.findMany({
      where: { attemptId },
      include: {
        mcq: {
          include: { objective: true },
        },
      },
    });
  }
}
