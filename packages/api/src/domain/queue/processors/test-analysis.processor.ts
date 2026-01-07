import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { TestAnalysisJobData } from '../queue.service';
@Processor('test-analysis')
export class TestAnalysisProcessor extends WorkerHost {
  private readonly logger = new Logger(TestAnalysisProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<TestAnalysisJobData>): Promise<any> {
    const { testId, userId } = job.data;

    this.logger.log(`Processing test analysis job ${job.id} for test ${testId}`);

    try {
      await job.updateProgress(10);

      // 1. Fetch the attempt with answers
      const attempt = await this.prisma.testAttempt.findUnique({
        where: { id: testId },
        include: {
          answers: {
            include: { mcq: true },
          },
        },
      });

      if (!attempt) {
        throw new Error(`Attempt ${testId} not found`);
      }

      await job.updateProgress(30);

      // 2. Prepare data for analysis
      const missedQuestions = attempt.answers
        .filter((answer: any) => !answer.isCorrect)
        .map((answer: any) => ({
          questionText: answer.mcq.question,
          selectedAnswer: answer.mcq.options[answer.selectedIdx],
          correctAnswer: answer.mcq.options[answer.mcq.correctIdx],
          explanation: answer.mcq.explanation || '',
        }));

      const allAnswers = attempt.answers.map((answer: any) => ({
        questionText: answer.mcq.question,
        selectedAnswer: answer.mcq.options[answer.selectedIdx],
        correctAnswer: answer.mcq.options[answer.mcq.correctIdx],
        isCorrect: answer.isCorrect,
      }));

      await job.updateProgress(50);

      // AI analysis skipped for now
      this.logger.log(`Test analysis skipped for test ${testId}`);

      await job.updateProgress(100);

      return { testId, status: 'completed' };
    } catch (error: any) {
      this.logger.error(`Test analysis failed for test ${testId}: ${error.message}`);
      throw error;
    }
  }
}
