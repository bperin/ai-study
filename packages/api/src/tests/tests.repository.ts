import { Injectable } from '@nestjs/common';
import { Mcq, Objective, TestAttempt, UserAnswer } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTestAttemptRecordDto } from './dto/create-test-attempt-record.dto';
import { CreateCompletedTestAttemptRecordDto } from './dto/create-completed-test-attempt-record.dto';
import { UpdateTestAttemptRecordDto } from './dto/update-test-attempt-record.dto';
import { CreateUserAnswerRecordDto } from './dto/create-user-answer-record.dto';
import { UpdateUserAnswerRecordDto } from './dto/update-user-answer-record.dto';
import { CreateObjectiveRecordDto } from './dto/create-objective-record.dto';

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

  async createAttempt(data: CreateTestAttemptRecordDto): Promise<TestAttempt & { answers: UserAnswer[] }> {
    return this.prisma.testAttempt.create({
      data: {
        userId: data.userId,
        pdfId: data.pdfId,
        total: data.total,
        score: data.score ?? 0,
        percentage: data.percentage ?? null,
      },
      include: {
        answers: true,
      },
    });
  }

  async createCompletedAttempt(data: CreateCompletedTestAttemptRecordDto): Promise<TestAttempt> {
    return this.prisma.testAttempt.create({
      data: {
        userId: data.userId,
        pdfId: data.pdfId,
        score: data.score,
        total: data.total,
        percentage: data.total > 0 ? (data.score / data.total) * 100 : 0,
        completedAt: new Date(),
        answers: {
          create: data.answers.map((answer) => ({
            mcqId: answer.mcqId,
            selectedIdx: answer.selectedIdx,
            isCorrect: answer.isCorrect,
          })),
        },
      },
      include: { answers: true },
    });
  }

  async updateAttempt(id: string, data: UpdateTestAttemptRecordDto): Promise<TestAttempt> {
    const payload: Record<string, any> = {};
    if (data.score !== undefined) payload.score = data.score;
    if (data.total !== undefined) payload.total = data.total;
    if (data.percentage !== undefined) payload.percentage = data.percentage;
    if (data.completedAt !== undefined) payload.completedAt = data.completedAt;
    if (data.summary !== undefined) payload.summary = data.summary;
    if (data.feedback !== undefined) payload.feedback = data.feedback;

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

  async createUserAnswer(data: CreateUserAnswerRecordDto): Promise<UserAnswer> {
    return this.prisma.userAnswer.create({
      data: {
        attemptId: data.attemptId,
        mcqId: data.mcqId,
        selectedIdx: data.selectedIdx,
        isCorrect: data.isCorrect,
        timeSpent: data.timeSpent,
      },
    });
  }

  async updateUserAnswer(id: string, data: UpdateUserAnswerRecordDto): Promise<UserAnswer> {
    const payload: Record<string, any> = {};
    if (data.selectedIdx !== undefined) payload.selectedIdx = data.selectedIdx;
    if (data.isCorrect !== undefined) payload.isCorrect = data.isCorrect;
    if (data.timeSpent !== undefined) payload.timeSpent = data.timeSpent;

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

  async createObjective(data: CreateObjectiveRecordDto): Promise<Objective> {
    return this.prisma.objective.create({
      data: {
        title: data.title,
        difficulty: data.difficulty,
        pdf: { connect: { id: data.pdfId } },
        mcqs: data.mcqs?.length
          ? {
              create: data.mcqs.map((mcq) => ({
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
