import { Injectable } from '@nestjs/common';
import { EvalItemReview, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateEvalItemReviewDto } from './dto/create-eval-item-review.dto';
import { UpdateEvalItemReviewDto } from './dto/update-eval-item-review.dto';

export interface FindEvalItemReviewsOptions {
  evalItemId?: string;
  reviewerId?: string;
  isCorrect?: boolean;
  difficulty?: string;
  minQuality?: number;
  maxQuality?: number;
  skip?: number;
  take?: number;
}

export interface ReviewStats {
  totalReviews: number;
  correctCount: number;
  incorrectCount: number;
  averageQuality: number | null;
  difficultyBreakdown: Record<string, number>;
  commonTags: Array<{ tag: string; count: number }>;
}

@Injectable()
export class EvalItemReviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateEvalItemReviewDto): Promise<EvalItemReview> {
    return this.prisma.evalItemReview.create({
      data: {
        evalItemId: data.evalItemId,
        reviewerId: data.reviewerId,
        isCorrect: data.isCorrect,
        feedback: data.feedback,
        difficulty: data.difficulty,
        quality: data.quality,
        tags: data.tags || [],
      },
    });
  }

  async findById(id: string): Promise<EvalItemReview | null> {
    return this.prisma.evalItemReview.findUnique({
      where: { id },
      include: {
        evalItem: true,
        reviewer: {
          select: {
            id: true,
            email: true,
            isAdmin: true,
          },
        },
      },
    });
  }

  async findByEvalItemAndReviewer(evalItemId: string, reviewerId: string): Promise<EvalItemReview | null> {
    return this.prisma.evalItemReview.findUnique({
      where: {
        evalItemId_reviewerId: {
          evalItemId,
          reviewerId,
        },
      },
    });
  }

  async update(id: string, data: UpdateEvalItemReviewDto): Promise<EvalItemReview> {
    return this.prisma.evalItemReview.update({
      where: { id },
      data: {
        isCorrect: data.isCorrect,
        feedback: data.feedback,
        difficulty: data.difficulty,
        quality: data.quality,
        tags: data.tags,
        updatedAt: new Date(),
      },
    });
  }

  async delete(id: string): Promise<EvalItemReview> {
    return this.prisma.evalItemReview.delete({
      where: { id },
    });
  }

  async findMany(options: FindEvalItemReviewsOptions): Promise<EvalItemReview[]> {
    const where: Prisma.EvalItemReviewWhereInput = {};

    if (options.evalItemId) where.evalItemId = options.evalItemId;
    if (options.reviewerId) where.reviewerId = options.reviewerId;
    if (options.isCorrect !== undefined) where.isCorrect = options.isCorrect;
    if (options.difficulty) where.difficulty = options.difficulty;
    if (options.minQuality !== undefined || options.maxQuality !== undefined) {
      where.quality = {};
      if (options.minQuality !== undefined) where.quality.gte = options.minQuality;
      if (options.maxQuality !== undefined) where.quality.lte = options.maxQuality;
    }

    return this.prisma.evalItemReview.findMany({
      where,
      skip: options.skip,
      take: options.take,
      orderBy: { createdAt: 'desc' },
      include: {
        evalItem: {
          select: {
            id: true,
            prompt: true,
            type: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            email: true,
            isAdmin: true,
          },
        },
      },
    });
  }

  async findByEvalItemId(evalItemId: string): Promise<EvalItemReview[]> {
    return this.prisma.evalItemReview.findMany({
      where: { evalItemId },
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
    });
  }

  async getReviewStats(evalItemId: string): Promise<ReviewStats> {
    const reviews = await this.prisma.evalItemReview.findMany({
      where: { evalItemId },
      select: {
        isCorrect: true,
        quality: true,
        difficulty: true,
        tags: true,
      },
    });

    const totalReviews = reviews.length;
    const correctCount = reviews.filter((r) => r.isCorrect).length;
    const incorrectCount = totalReviews - correctCount;

    const qualityScores = reviews.filter((r) => r.quality !== null).map((r) => r.quality!);
    const averageQuality = qualityScores.length > 0 ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length : null;

    // Difficulty breakdown
    const difficultyBreakdown: Record<string, number> = {};
    reviews.forEach((review) => {
      if (review.difficulty) {
        difficultyBreakdown[review.difficulty] = (difficultyBreakdown[review.difficulty] || 0) + 1;
      }
    });

    // Common tags
    const tagCounts: Record<string, number> = {};
    reviews.forEach((review) => {
      review.tags.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    const commonTags = Object.entries(tagCounts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 tags

    return {
      totalReviews,
      correctCount,
      incorrectCount,
      averageQuality,
      difficultyBreakdown,
      commonTags,
    };
  }

  async hasReviewed(evalItemId: string, reviewerId: string): Promise<boolean> {
    const review = await this.prisma.evalItemReview.findUnique({
      where: {
        evalItemId_reviewerId: {
          evalItemId,
          reviewerId,
        },
      },
    });

    return review !== null;
  }

  async countByEvalItem(evalItemId: string): Promise<number> {
    return this.prisma.evalItemReview.count({
      where: { evalItemId },
    });
  }

  async countByReviewer(reviewerId: string): Promise<number> {
    return this.prisma.evalItemReview.count({
      where: { reviewerId },
    });
  }
}
