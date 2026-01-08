import { Injectable } from '@nestjs/common';
import { EvalItem, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateEvalItemDto } from './dto/create-eval-item.dto';
import { UpdateEvalItemDto } from './dto/update-eval-item.dto';

export interface FindEvalItemsOptions {
  evalId?: string;
  type?: string;
  hasImage?: boolean;
  skip?: number;
  take?: number;
  includeReviews?: boolean;
  includeAnswers?: boolean;
}

@Injectable()
export class EvalItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateEvalItemDto): Promise<EvalItem> {
    // Validate that the eval exists and can be modified
    const eval_ = await this.prisma.eval.findUnique({
      where: { id: data.evalId },
      select: { status: true },
    });

    if (!eval_) {
      throw new Error('Eval not found');
    }

    if (eval_.status !== 'draft') {
      throw new Error('Cannot add items to published or archived eval');
    }

    return this.prisma.evalItem.create({
      data: {
        evalId: data.evalId,
        type: data.type,
        prompt: data.prompt,
        options: data.options,
        correctIdx: data.correctIdx,
        hasImage: data.hasImage || false,
        imageUrl: data.imageUrl,
        imagePrompt: data.imagePrompt,
        hint: data.hint,
        explanation: data.explanation,
        metadata: data.metadata as Prisma.JsonValue,
      },
    });
  }

  async findById(id: string, options?: { includeReviews?: boolean; includeAnswers?: boolean }): Promise<EvalItem | null> {
    const include: Prisma.EvalItemInclude = {};

    if (options?.includeReviews) {
      include.reviews = {
        include: {
          reviewer: {
            select: {
              id: true,
              email: true,
              isAdmin: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      };
    }

    if (options?.includeAnswers) {
      include.userAnswers = {
        include: {
          attempt: {
            select: {
              id: true,
              userId: true,
              startedAt: true,
              completedAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      };
    }

    return this.prisma.evalItem.findUnique({
      where: { id },
      include: Object.keys(include).length > 0 ? include : undefined,
    });
  }

  async update(id: string, data: UpdateEvalItemDto): Promise<EvalItem> {
    // Check if the eval item's eval can be modified
    const evalItem = await this.prisma.evalItem.findUnique({
      where: { id },
      include: {
        eval: {
          select: { status: true },
        },
      },
    });

    if (!evalItem) {
      throw new Error('EvalItem not found');
    }

    if (evalItem.eval.status !== 'draft') {
      throw new Error('Cannot modify items of published or archived eval');
    }

    return this.prisma.evalItem.update({
      where: { id },
      data: {
        type: data.type,
        prompt: data.prompt,
        options: data.options,
        correctIdx: data.correctIdx,
        hasImage: data.hasImage,
        imageUrl: data.imageUrl,
        imagePrompt: data.imagePrompt,
        hint: data.hint,
        explanation: data.explanation,
        metadata: data.metadata as Prisma.JsonValue,
      },
    });
  }

  async delete(id: string): Promise<EvalItem> {
    // Check if the eval item's eval can be modified
    const evalItem = await this.prisma.evalItem.findUnique({
      where: { id },
      include: {
        eval: {
          select: { status: true },
        },
      },
    });

    if (!evalItem) {
      throw new Error('EvalItem not found');
    }

    if (evalItem.eval.status !== 'draft') {
      throw new Error('Cannot delete items from published or archived eval');
    }

    return this.prisma.evalItem.delete({
      where: { id },
    });
  }

  async findMany(options: FindEvalItemsOptions): Promise<EvalItem[]> {
    const where: Prisma.EvalItemWhereInput = {};
    const include: Prisma.EvalItemInclude = {};

    if (options.evalId) where.evalId = options.evalId;
    if (options.type) where.type = options.type;
    if (options.hasImage !== undefined) where.hasImage = options.hasImage;

    if (options.includeReviews) {
      include.reviews = {
        include: {
          reviewer: {
            select: {
              id: true,
              email: true,
              isAdmin: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      };
    }

    if (options.includeAnswers) {
      include.userAnswers = {
        include: {
          attempt: {
            select: {
              id: true,
              userId: true,
              startedAt: true,
              completedAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      };
    }

    return this.prisma.evalItem.findMany({
      where,
      skip: options.skip,
      take: options.take,
      orderBy: { createdAt: 'asc' },
      include: Object.keys(include).length > 0 ? include : undefined,
    });
  }

  async findByEvalId(evalId: string, options?: { includeReviews?: boolean }): Promise<EvalItem[]> {
    const include: Prisma.EvalItemInclude = {};

    if (options?.includeReviews) {
      include.reviews = {
        include: {
          reviewer: {
            select: {
              id: true,
              email: true,
              isAdmin: true,
            },
          },
        },
      };
    }

    return this.prisma.evalItem.findMany({
      where: { evalId },
      orderBy: { createdAt: 'asc' },
      include: Object.keys(include).length > 0 ? include : undefined,
    });
  }

  async countByEvalId(evalId: string): Promise<number> {
    return this.prisma.evalItem.count({
      where: { evalId },
    });
  }

  async isCorrectAnswer(id: string, selectedIdx: number): Promise<boolean> {
    const evalItem = await this.prisma.evalItem.findUnique({
      where: { id },
      select: { correctIdx: true },
    });

    if (!evalItem || evalItem.correctIdx === null) {
      throw new Error('No correct answer defined for this eval item');
    }

    return selectedIdx === evalItem.correctIdx;
  }

  async isHintEligible(id: string): Promise<boolean> {
    const evalItem = await this.prisma.evalItem.findUnique({
      where: { id },
      select: { hint: true },
    });

    return evalItem?.hint !== null && evalItem?.hint?.trim().length > 0;
  }

  async getHint(id: string): Promise<string | null> {
    const isEligible = await this.isHintEligible(id);
    if (!isEligible) return null;

    const evalItem = await this.prisma.evalItem.findUnique({
      where: { id },
      select: { hint: true },
    });

    return evalItem?.hint || null;
  }

  async findWithReviewStats(evalId: string): Promise<Array<EvalItem & { reviewStats: any }>> {
    const items = await this.prisma.evalItem.findMany({
      where: { evalId },
      include: {
        reviews: {
          select: {
            isCorrect: true,
            quality: true,
            difficulty: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return items.map((item) => {
      const reviews = item.reviews;
      const totalReviews = reviews.length;
      const correctCount = reviews.filter((r) => r.isCorrect).length;
      const qualityScores = reviews.filter((r) => r.quality !== null).map((r) => r.quality!);
      const averageQuality = qualityScores.length > 0 ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length : null;

      const difficultyBreakdown: Record<string, number> = {};
      reviews.forEach((review) => {
        if (review.difficulty) {
          difficultyBreakdown[review.difficulty] = (difficultyBreakdown[review.difficulty] || 0) + 1;
        }
      });

      return {
        ...item,
        reviewStats: {
          totalReviews,
          correctCount,
          incorrectCount: totalReviews - correctCount,
          averageQuality,
          difficultyBreakdown,
        },
      };
    });
  }

  async bulkCreate(evalId: string, items: Omit<CreateEvalItemDto, 'evalId'>[]): Promise<EvalItem[]> {
    // Validate that the eval exists and can be modified
    const eval_ = await this.prisma.eval.findUnique({
      where: { id: evalId },
      select: { status: true },
    });

    if (!eval_) {
      throw new Error('Eval not found');
    }

    if (eval_.status !== 'draft') {
      throw new Error('Cannot add items to published or archived eval');
    }

    const createData = items.map((item) => ({
      evalId,
      type: item.type,
      prompt: item.prompt,
      options: item.options,
      correctIdx: item.correctIdx,
      hasImage: item.hasImage || false,
      imageUrl: item.imageUrl,
      imagePrompt: item.imagePrompt,
      hint: item.hint,
      explanation: item.explanation,
      metadata: item.metadata as Prisma.JsonValue,
    }));

    await this.prisma.evalItem.createMany({
      data: createData,
    });

    // Return the created items
    return this.findByEvalId(evalId);
  }
}
