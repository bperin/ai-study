import { Injectable } from '@nestjs/common';
import { Mcq, Objective, TestAttempt, UserAnswer } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class TestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // MCQs
  async findMcqsByIds(ids: string[]): Promise<Mcq[]> {
    return this.prisma.mcq.findMany({ where: { id: { in: ids } } });
  }

  async findMcqsByPdfId(pdfId: string): Promise<(Mcq & { objective: Objective })[]> {
    return this.prisma.mcq.findMany({
      where: { objective: { pdfId } },
      include: { objective: true },
    });
  }

  async findMcqById(id: string): Promise<(Mcq & { objective: Objective & { pdf: { content: string | null; gcsPath: string | null; filename: string } } }) | null> {
    return this.prisma.mcq.findUnique({
      where: { id },
      include: {
        objective: {
          include: {
            pdf: {
              select: {
                content: true,
                gcsPath: true,
                filename: true,
              },
            },
          },
        },
      },
    });
  }

  async countMcqsByPdfId(pdfId: string): Promise<number> {
    return this.prisma.mcq.count({ where: { objective: { pdfId } } });
  }

  // Objectives
  async findObjectivesByPdfId(pdfId: string): Promise<(Objective & { mcqs: Mcq[] })[]> {
    return this.prisma.objective.findMany({
      where: { pdfId },
      include: { mcqs: true },
    });
  }

  // Attempts
  async findAttemptById(id: string): Promise<
    | (TestAttempt & {
        answers: (UserAnswer & { mcq: Mcq & { objective: Objective } })[];
        pdf: { filename: string; gcsPath: string | null; content: string | null };
        user: { email: string; id: string };
      })
    | null
  > {
    return this.prisma.testAttempt.findUnique({
      where: { id },
      include: {
        answers: {
          include: { mcq: { include: { objective: true } } },
          orderBy: { createdAt: 'asc' },
        },
        pdf: {
          select: {
            filename: true,
            gcsPath: true,
            content: true,
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
    pdfId: string,
  ): Promise<
    | (TestAttempt & {
        answers: (UserAnswer & { mcq: Mcq & { objective: Objective } })[];
      })
    | null
  > {
    return this.prisma.testAttempt.findFirst({
      where: {
        userId,
        pdfId,
        completedAt: null,
      },
      include: {
        answers: {
          include: { mcq: { include: { objective: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async createAttempt(userId: string, pdfId: string, total: number, score: number = 0, percentage?: number | null): Promise<TestAttempt & { answers: UserAnswer[] }> {
    return this.prisma.testAttempt.create({
      data: {
        userId,
        pdfId,
        total,
        score,
        percentage: percentage ?? null,
      },
      include: {
        answers: true,
      },
    });
  }

  async createCompletedAttempt(userId: string, pdfId: string, score: number, total: number, answers: Array<{ mcqId: string; selectedIdx: number; isCorrect: boolean }>): Promise<TestAttempt> {
    return this.prisma.testAttempt.create({
      data: {
        userId,
        pdfId,
        score,
        total,
        percentage: total > 0 ? (score / total) * 100 : 0,
        completedAt: new Date(),
        answers: {
          create: answers.map((answer) => ({
            mcqId: answer.mcqId,
            selectedIdx: answer.selectedIdx,
            isCorrect: answer.isCorrect,
          })),
        },
      },
      include: { answers: true },
    });
  }

  async updateAttempt(id: string, score?: number, total?: number, percentage?: number | null, completedAt?: Date | null, summary?: string | null, feedback?: string | null): Promise<TestAttempt> {
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
  async findCompletedAttemptsByPdf(pdfId: string, limit: number = 10): Promise<(TestAttempt & { user: { id: string; email: string } })[]> {
    return this.prisma.testAttempt.findMany({
      where: { pdfId, completedAt: { not: null } },
      include: { user: { select: { id: true, email: true } } },
      orderBy: { percentage: 'desc' },
      take: limit,
    });
  }

  async findCompletedAttemptsByPdfIds(pdfIds: string[]): Promise<(TestAttempt & { user: { id: string; email: string } })[]> {
    return this.prisma.testAttempt.findMany({
      where: { pdfId: { in: pdfIds }, completedAt: { not: null } },
      include: { user: { select: { id: true, email: true } } },
    });
  }

  async findAllCompletedAttempts(): Promise<(TestAttempt & { user: { id: string; email: string } })[]> {
    return this.prisma.testAttempt.findMany({
      where: { completedAt: { not: null } },
      include: { user: { select: { id: true, email: true } } },
    });
  }

  async findUserAttempts(userId: string): Promise<(TestAttempt & { pdf: { filename: string }; answers: (UserAnswer & { mcq: Mcq })[] })[]> {
    return this.prisma.testAttempt.findMany({
      where: { userId },
      include: {
        pdf: { select: { filename: true } },
        answers: { include: { mcq: true } },
      },
      orderBy: [{ completedAt: 'desc' }, { startedAt: 'desc' }],
    });
  }

  async findAllAttemptsWithDetails(): Promise<(TestAttempt & { pdf: { filename: string }; user: { id: string; email: string }; answers: (UserAnswer & { mcq: Mcq })[] })[]> {
    return this.prisma.testAttempt.findMany({
      include: {
        pdf: { select: { filename: true } },
        user: { select: { id: true, email: true } },
        answers: { include: { mcq: true } },
      },
      orderBy: [{ completedAt: 'desc' }, { startedAt: 'desc' }],
    });
  }

  // Answers
  async findUserAnswer(attemptId: string, mcqId: string): Promise<UserAnswer | null> {
    return this.prisma.userAnswer.findFirst({
      where: { attemptId, mcqId },
    });
  }

  async createUserAnswer(attemptId: string, mcqId: string, selectedIdx: number, isCorrect: boolean, timeSpent?: number | null): Promise<UserAnswer> {
    return this.prisma.userAnswer.create({
      data: {
        attemptId,
        mcqId,
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
  async deletePdfRelatedData(pdfId: string) {
    // Transactions would be better here but following existing pattern
    await this.prisma.userAnswer.deleteMany({ where: { attempt: { pdfId } } });
    await this.prisma.testAttempt.deleteMany({ where: { pdfId } });
    await this.prisma.mcq.deleteMany({ where: { objective: { pdfId } } });
    await this.prisma.objective.deleteMany({ where: { pdfId } });
  }

  async createObjective(pdfId: string, title: string, difficulty: 'easy' | 'medium' | 'hard', mcqs?: Array<{ question: string; options: string[]; correctIdx: number; explanation?: string | null; hint?: string | null }>): Promise<Objective> {
    return this.prisma.objective.create({
      data: {
        title,
        difficulty,
        pdf: { connect: { id: pdfId } },
        mcqs: mcqs?.length
          ? {
              create: mcqs.map((mcq) => ({
                question: mcq.question,
                options: mcq.options,
                correctIdx: mcq.correctIdx,
                explanation: mcq.explanation ?? null,
                hint: mcq.hint ?? null,
              })),
            }
          : undefined,
      },
      include: { mcqs: true },
    });
  }
}
