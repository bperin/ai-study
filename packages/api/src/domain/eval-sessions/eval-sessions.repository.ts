import { Injectable } from '@nestjs/common';
import { EvalSession, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { IEvalSessionRepository, CreateEvalSessionDto, UpdateEvalSessionDto, FindEvalSessionsOptions } from './interfaces/eval-session.repository.interface';

@Injectable()
export class EvalSessionsRepository implements IEvalSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateEvalSessionDto): Promise<EvalSession> {
    return this.prisma.evalSession.create({
      data: {
        userId: data.userId,
        userPreferences: data.userPreferences as Prisma.JsonValue,
        proposedPlan: data.proposedPlan as Prisma.JsonValue,
        planStatus: data.planStatus || 'pending',
        iterationCount: data.iterationCount || 0,
        difficulty: data.difficulty,
        totalItems: data.totalItems,
        includeImages: data.includeImages || false,
        imageCount: data.imageCount || 0,
        timeLimitMins: data.timeLimitMins,
        status: data.status || 'planning',
      },
    });
  }

  async findById(id: string): Promise<EvalSession | null> {
    return this.prisma.evalSession.findUnique({
      where: { id },
    });
  }

  async findByUserId(userId: string, options?: FindEvalSessionsOptions): Promise<EvalSession[]> {
    const where: Prisma.EvalSessionWhereInput = { userId };

    if (options?.status) {
      where.status = options.status;
    }

    return this.prisma.evalSession.findMany({
      where,
      skip: options?.skip,
      take: options?.take,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async update(id: string, data: UpdateEvalSessionDto): Promise<EvalSession> {
    const updateData: Prisma.EvalSessionUpdateInput = {};

    if (data.userPreferences !== undefined) updateData.userPreferences = data.userPreferences as Prisma.JsonValue;
    if (data.proposedPlan !== undefined) updateData.proposedPlan = data.proposedPlan as Prisma.JsonValue;
    if (data.planStatus !== undefined) updateData.planStatus = data.planStatus;
    if (data.iterationCount !== undefined) updateData.iterationCount = data.iterationCount;
    if (data.difficulty !== undefined) updateData.difficulty = data.difficulty;
    if (data.totalItems !== undefined) updateData.totalItems = data.totalItems;
    if (data.includeImages !== undefined) updateData.includeImages = data.includeImages;
    if (data.imageCount !== undefined) updateData.imageCount = data.imageCount;
    if (data.timeLimitMins !== undefined) updateData.timeLimitMins = data.timeLimitMins;
    if (data.status !== undefined) updateData.status = data.status;

    return this.prisma.evalSession.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string): Promise<EvalSession> {
    return this.prisma.evalSession.delete({
      where: { id },
    });
  }

  async count(userId?: string): Promise<number> {
    const where: Prisma.EvalSessionWhereInput = {};

    if (userId) {
      where.userId = userId;
    }

    return this.prisma.evalSession.count({ where });
  }
}
