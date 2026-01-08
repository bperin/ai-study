import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class TestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // EvalItems
  async findEvalItemsByIds(ids: string[]) {
    return this.prisma.evalItem.findMany({ where: { id: { in: ids } } });
  }

  async findEvalItemsByEvalId(evalId: string) {
    return this.prisma.evalItem.findMany({
      where: { evalId },
    });
  }

  async findEvalItemById(id: string) {
    return this.prisma.evalItem.findUnique({
      where: { id },
      include: {
        eval: {
          include: {
            document: {
              select: {
                content: true,
                storagePath: true,
                filename: true,
                ragFileUri: true,
              },
            },
          },
        },
      },
    });
  }

  async countEvalItemsByEvalId(evalId: string): Promise<number> {
    return this.prisma.evalItem.count({ where: { evalId } });
  }

  // Evals
  async findEvalsByDocumentId(documentId: string) {
    return this.prisma.eval.findMany({
      where: { documentId },
      include: { items: true },
    });
  }

  // Attempts
  async findAttemptById(id: string) {
    return this.prisma.testAttempt.findUnique({
      where: { id },
      include: {
        answers: {
          include: { evalItem: { include: { eval: true } } },
          orderBy: { createdAt: 'asc' },
        },
        user: {
          select: {
            email: true,
            id: true,
          },
        },
      },
    });
  }

  async findActiveAttempt(userId: string, evalId: string) {
    return this.prisma.testAttempt.findFirst({
      where: {
        userId,
        evalId,
        completedAt: null,
      },
      include: {
        answers: {
          include: { evalItem: { include: { eval: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async createAttempt(userId: string, evalId: string, total: number, score: number = 0, percentage?: number | null) {
    const eval_ = await this.prisma.eval.findUnique({ where: { id: evalId } });

    return this.prisma.testAttempt.create({
      data: {
        userId,
        evalId,
        total,
        score,
        percentage: percentage ?? null,
      },
      include: {
        answers: true,
      },
    });
  }

  async createCompletedAttempt(userId: string, evalId: string, score: number, total: number, answers: Array<{ evalItemId: string; selectedIdx: number; isCorrect: boolean }>) {
    return this.prisma.testAttempt.create({
      data: {
        userId,
        evalId,
        score,
        total,
        percentage: total > 0 ? (score / total) * 100 : 0,
        completedAt: new Date(),
        answers: {
          create: answers.map((answer) => ({
            evalItemId: answer.evalItemId,
            selectedIdx: answer.selectedIdx,
            isCorrect: answer.isCorrect,
          })),
        },
      },
      include: { answers: true },
    });
  }

  async updateAttempt(id: string, score?: number, total?: number, percentage?: number | null, completedAt?: Date | null, summary?: string | null, feedback?: any | null) {
    const payload: Record<string, any> = {};
    if (score !== undefined) payload.score = score;
    if (total !== undefined) payload.total = total;
    if (percentage !== undefined) payload.percentage = percentage;
    if (completedAt !== undefined) payload.completedAt = completedAt;
    if (summary !== undefined) payload.summary = summary;
    if (feedback !== undefined) payload.feedback = feedback;

    return this.prisma.testAttempt.update({
      where: { id },
      data: payload,
    });
  }

  // History / Leaderboard
  async findCompletedAttemptsByEval(evalId: string, limit: number = 10) {
    return this.prisma.testAttempt.findMany({
      where: { evalId, completedAt: { not: null } },
      include: { user: { select: { id: true, email: true } } },
      orderBy: { percentage: 'desc' },
      take: limit,
    });
  }

  async findCompletedAttemptsByEvalIds(evalIds: string[]) {
    return this.prisma.testAttempt.findMany({
      where: { evalId: { in: evalIds }, completedAt: { not: null } },
      include: { user: { select: { id: true, email: true } } },
    });
  }

  async findAllCompletedAttempts() {
    return this.prisma.testAttempt.findMany({
      where: { completedAt: { not: null } },
      include: { user: { select: { id: true, email: true } } },
    });
  }

  async findUserAttempts(userId: string) {
    return this.prisma.testAttempt.findMany({
      where: { userId },
      include: {
        answers: { include: { evalItem: true } },
      },
      orderBy: [{ completedAt: 'desc' }, { startedAt: 'desc' }],
    });
  }

  async findAllAttemptsWithDetails() {
    return this.prisma.testAttempt.findMany({
      include: {
        user: { select: { id: true, email: true } },
        answers: { include: { evalItem: true } },
      },
      orderBy: [{ completedAt: 'desc' }, { startedAt: 'desc' }],
    });
  }

  // Answers
  async findUserAnswer(attemptId: string, evalItemId: string) {
    return this.prisma.userAnswer.findFirst({
      where: { attemptId, evalItemId },
    });
  }

  async createUserAnswer(attemptId: string, evalItemId: string, selectedIdx: number, isCorrect: boolean, timeSpent?: number | null) {
    return this.prisma.userAnswer.create({
      data: {
        attemptId,
        evalItemId,
        selectedIdx,
        isCorrect,
        timeSpent,
      },
    });
  }

  async updateUserAnswer(id: string, selectedIdx?: number, isCorrect?: boolean, timeSpent?: number | null) {
    const payload: Record<string, any> = {};
    if (selectedIdx !== undefined) payload.selectedIdx = selectedIdx;
    if (isCorrect !== undefined) payload.isCorrect = isCorrect;
    if (timeSpent !== undefined) payload.timeSpent = timeSpent;

    return this.prisma.userAnswer.update({
      where: { id },
      data: payload,
    });
  }

  // Deletion (Admin/Cleanup)
  async deleteDocumentRelatedData(documentId: string) {
    // Get all evals for this document
    const evals = await this.prisma.eval.findMany({
      where: { documentId },
      select: { id: true },
    });

    const evalIds = evals.map((e) => e.id);

    // Delete all user answers for attempts on these evals
    await this.prisma.userAnswer.deleteMany({
      where: { attempt: { evalId: { in: evalIds } } },
    });

    // Delete all attempts for these evals
    await this.prisma.testAttempt.deleteMany({
      where: { evalId: { in: evalIds } },
    });

    // Delete all eval items for these evals
    await this.prisma.evalItem.deleteMany({
      where: { evalId: { in: evalIds } },
    });

    // Delete all evals for this document
    await this.prisma.eval.deleteMany({
      where: { documentId },
    });
  }

  async createEval(documentId: string, title: string, description: string, difficulty: string) {
    return this.prisma.eval.create({
      data: {
        title,
        description,
        difficulty,
        document: { connect: { id: documentId } },
        user: { connect: { id: (await this.prisma.document.findUnique({ where: { id: documentId }, select: { userId: true } }))?.userId } },
      },
    });
  }

  async createEvalItem(evalId: string, type: string, prompt: string, options: string[], correctIdx: number, explanation?: string | null, hint?: string | null) {
    return this.prisma.evalItem.create({
      data: {
        evalId,
        type,
        prompt,
        options,
        correctIdx,
        explanation,
        hint,
      },
    });
  }
}
