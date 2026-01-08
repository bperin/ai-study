import { Injectable } from '@nestjs/common';
import { Eval, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateEvalDto } from './dto/create-eval.dto';
import { UpdateEvalDto } from './dto/update-eval.dto';

export interface FindEvalsOptions {
  userId?: string;
  subjectId?: string;
  status?: 'draft' | 'published' | 'archived';
  difficulty?: string;
  skip?: number;
  take?: number;
  includeItems?: boolean;
  includeAttempts?: boolean;
}

@Injectable()
export class EvalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateEvalDto): Promise<Eval> {
    return this.prisma.eval.create({
      data: {
        title: data.title,
        description: data.description,
        status: 'draft',
        difficulty: data.difficulty,
        instructions: data.instructions,
        rubric: data.rubric as Prisma.JsonValue,
        subjectId: data.subjectId,
        userId: data.userId,
      },
    });
  }

  async findById(id: string, options?: { includeItems?: boolean; includeAttempts?: boolean }): Promise<Eval | null> {
    const include: Prisma.EvalInclude = {};

    if (options?.includeItems) {
      include.items = {
        orderBy: { createdAt: 'asc' },
      };
    }

    if (options?.includeAttempts) {
      include.attempts = {
        orderBy: { startedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      };
    }

    return this.prisma.eval.findUnique({
      where: { id },
      include: Object.keys(include).length > 0 ? include : undefined,
    });
  }

  async update(id: string, data: UpdateEvalDto): Promise<Eval> {
    return this.prisma.eval.update({
      where: { id },
      data: {
        title: data.title,
        description: data.description,
        difficulty: data.difficulty,
        instructions: data.instructions,
        rubric: data.rubric as Prisma.JsonValue,
        subjectId: data.subjectId,
        updatedAt: new Date(),
      },
    });
  }

  async delete(id: string): Promise<Eval> {
    return this.prisma.eval.delete({
      where: { id },
    });
  }

  async findMany(options: FindEvalsOptions): Promise<Eval[]> {
    const where: Prisma.EvalWhereInput = {};
    const include: Prisma.EvalInclude = {};

    if (options.userId) where.userId = options.userId;
    if (options.subjectId) where.subjectId = options.subjectId;
    if (options.status) where.status = options.status;
    if (options.difficulty) where.difficulty = options.difficulty;

    if (options.includeItems) {
      include.items = {
        orderBy: { createdAt: 'asc' },
      };
    }

    if (options.includeAttempts) {
      include.attempts = {
        orderBy: { startedAt: 'desc' },
        take: 5, // Limit to recent attempts
      };
    }

    return this.prisma.eval.findMany({
      where,
      skip: options.skip,
      take: options.take,
      orderBy: { createdAt: 'desc' },
      include: Object.keys(include).length > 0 ? include : undefined,
    });
  }

  async publish(id: string): Promise<Eval> {
    const eval_ = await this.findById(id);
    if (!eval_) {
      throw new Error('Eval not found');
    }

    if (eval_.status === 'published') {
      throw new Error('Eval is already published');
    }

    if (eval_.status === 'archived') {
      throw new Error('Cannot publish archived eval');
    }

    return this.prisma.eval.update({
      where: { id },
      data: {
        status: 'published',
        publishedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async archive(id: string): Promise<Eval> {
    const eval_ = await this.findById(id);
    if (!eval_) {
      throw new Error('Eval not found');
    }

    if (eval_.status === 'archived') {
      throw new Error('Eval is already archived');
    }

    return this.prisma.eval.update({
      where: { id },
      data: {
        status: 'archived',
        archivedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async findPublished(options?: { subjectId?: string; difficulty?: string; skip?: number; take?: number; includeItems?: boolean }): Promise<Eval[]> {
    const where: Prisma.EvalWhereInput = { status: 'published' };
    const include: Prisma.EvalInclude = {};

    if (options?.subjectId) where.subjectId = options.subjectId;
    if (options?.difficulty) where.difficulty = options.difficulty;

    if (options?.includeItems) {
      include.items = {
        orderBy: { createdAt: 'asc' },
      };
    }

    return this.prisma.eval.findMany({
      where,
      skip: options?.skip,
      take: options?.take,
      orderBy: { publishedAt: 'desc' },
      include: Object.keys(include).length > 0 ? include : undefined,
    });
  }

  async countByStatus(userId?: string): Promise<Record<string, number>> {
    const where: Prisma.EvalWhereInput = {};
    if (userId) where.userId = userId;

    const [draftCount, publishedCount, archivedCount] = await Promise.all([this.prisma.eval.count({ where: { ...where, status: 'draft' } }), this.prisma.eval.count({ where: { ...where, status: 'published' } }), this.prisma.eval.count({ where: { ...where, status: 'archived' } })]);

    return {
      draft: draftCount,
      published: publishedCount,
      archived: archivedCount,
    };
  }

  async canModify(id: string): Promise<boolean> {
    const eval_ = await this.prisma.eval.findUnique({
      where: { id },
      select: { status: true },
    });

    return eval_?.status === 'draft';
  }

  async isPublished(id: string): Promise<boolean> {
    const eval_ = await this.prisma.eval.findUnique({
      where: { id },
      select: { status: true },
    });

    return eval_?.status === 'published';
  }

  async findBySubject(subjectId: string, status?: 'draft' | 'published' | 'archived'): Promise<Eval[]> {
    const where: Prisma.EvalWhereInput = { subjectId };
    if (status) where.status = status;

    return this.prisma.eval.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          select: {
            id: true,
          },
        },
      },
    });
  }
}
