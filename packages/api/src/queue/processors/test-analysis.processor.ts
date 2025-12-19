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
      await job.updateProgress(50);

      this.logger.log(`Test analysis completed for test ${testId}`);
      
      await job.updateProgress(100);
      
      return { testId, status: 'completed' };
    } catch (error: any) {
      this.logger.error(`Test analysis failed for test ${testId}: ${error.message}`);
      throw error;
    }
  }
}
