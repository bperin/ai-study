import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { TestAttempt, UserAnswer, EvalItem, Eval } from '@prisma/client';

@Injectable()
export class TestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // EvalItems
  async findEvalItemsByIds(ids: string[]): Promise<EvalItem[]> {
    return this.prisma.evalItem.findMany({ where: { id: { in: ids } } });
  }

  async findEvalItemsByEvalId(evalId: string): Promise<EvalItem[]> {
    return this.prisma.evalItem.findMany({
      where: { evalId },
    });
  }

  async findEvalItemById(id: string): Promise<(EvalItem & { eval: Eval & { document: { content: string | null; storagePath: string | null; filename: string; ragFileUri: string | null } } }) | null> {
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
  async findEvalsByDocumentId(documentId: string): Promise<(Eval & { items: EvalItem[] })[]> {
    return this.prisma.eval.findMany({
      where: { documentId },
      include: { items: true },
    });
  }

  // Attempts
  async findAttemptById(id: string): Promise<
    | (TestAttempt & {
        answers: (UserAnswer & { evalItem: EvalItem & { eval: Eval } })[];
        document: { filename: string; storagePath: string | null; content: string | null; ragFileUri: string | null };
        user: { email: string; id: string };
      })
    | null
  > {
    return this.prisma.testAttempt.findUnique({
      where: { id },
      include: {
        answers: {
          include: { evalItem: { include: { eval: true } } },
          orderBy: { createdAt: 'asc' },
        },
        document: {
          select: {
            filename: true,
            storagePath: true,
            content: true,
            ragFileUri: true,
          },
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

  async findActiveAttempt(
    userId: string,
    documentId: string,
  ): Promise<
    | (TestAttempt & {
        answers: (UserAnswer & { evalItem: EvalItem & { eval: Eval } })[];
      })
    | null
  > {
    return this.prisma.testAttempt.findFirst({
      where: {
        userId,
        documentId,
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

  async createAttempt(userId: string, documentId: string, evalId: string, total: number, score: number = 0, percentage?: number | null): Promise<TestAttempt & { answers: UserAnswer[] }> {
    return this.prisma.testAttempt.create({
      data: {
        userId,
        documentId,
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

  async createCompletedAttempt(userId: string, documentId: string, evalId: string, score: number, total: number, answers: Array<{ evalItemId: string; selectedIdx: number; isCorrect: boolean }>): Promise<TestAttempt> {
    return this.prisma.testAttempt.create({
      data: {
        userId,
        documentId,
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

  async updateAttempt(id: string, score?: number, total?: number, percentage?: number | null, completedAt?: Date | null, summary?: string | null, feedback?: any | null): Promise<TestAttempt> {
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
  async findCompletedAttemptsByDocument(documentId: string, limit: number = 10): Promise<(TestAttempt & { user: { id: string; email: string } })[]> {
    return this.prisma.testAttempt.findMany({
      where: { documentId, completedAt: { not: null } },
      include: { user: { select: { id: true, email: true } } },
      orderBy: { percentage: 'desc' },
      take: limit,
    });
  }

  async findCompletedAttemptsByDocumentIds(documentIds: string[]): Promise<(TestAttempt & { user: { id: string; email: string } })[]> {
    return this.prisma.testAttempt.findMany({
      where: { documentId: { in: documentIds }, completedAt: { not: null } },
      include: { user: { select: { id: true, email: true } } },
    });
  }

  async findAllCompletedAttempts(): Promise<(TestAttempt & { user: { id: string; email: string } })[]> {
    return this.prisma.testAttempt.findMany({
      where: { completedAt: { not: null } },
      include: { user: { select: { id: true, email: true } } },
    });
  }

  async findUserAttempts(userId: string): Promise<(TestAttempt & { document: { filename: string }; answers: (UserAnswer & { evalItem: EvalItem })[] })[]> {
    return this.prisma.testAttempt.findMany({
      where: { userId },
      include: {
        document: { select: { filename: true } },
        answers: { include: { evalItem: true } },
      },
      orderBy: [{ completedAt: 'desc' }, { startedAt: 'desc' }],
    });
  }

  async findAllAttemptsWithDetails(): Promise<(TestAttempt & { document: { filename: string }; user: { id: string; email: string }; answers: (UserAnswer & { evalItem: EvalItem })[] })[]> {
    return this.prisma.testAttempt.findMany({
      include: {
        document: { select: { filename: true } },
        user: { select: { id: true, email: true } },
        answers: { include: { evalItem: true } },
      },
      orderBy: [{ completedAt: 'desc' }, { startedAt: 'desc' }],
    });
  }

  // Answers
  async findUserAnswer(attemptId: string, evalItemId: string): Promise<UserAnswer | null> {
    return this.prisma.userAnswer.findFirst({
      where: { attemptId, evalItemId },
    });
  }

  async createUserAnswer(attemptId: string, evalItemId: string, selectedIdx: number, isCorrect: boolean, timeSpent?: number | null): Promise<UserAnswer> {
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

  async updateUserAnswer(id: string, selectedIdx?: number, isCorrect?: boolean, timeSpent?: number | null): Promise<UserAnswer> {
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
    // Transactions would be better here but following existing pattern
    await this.prisma.userAnswer.deleteMany({ where: { attempt: { documentId } } });
    await this.prisma.testAttempt.deleteMany({ where: { documentId } });
    await this.prisma.evalItem.deleteMany({ where: { eval: { documentId } } });
    await this.prisma.eval.deleteMany({ where: { documentId } });
  }

  async createEval(documentId: string, title: string, description: string, difficulty: string): Promise<Eval> {
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

  async createEvalItem(evalId: string, type: string, prompt: string, options: string[], correctIdx: number, explanation?: string | null, hint?: string | null): Promise<EvalItem> {
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
