import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface PdfIngestionJobData {
  documentId: string;
  gcsUri: string;
  title?: string;
  pdfId?: string;
}

export interface FlashcardGenerationJobData {
  pdfId: string;
  sessionId: string;
  userId: string;
  userPrompt: string;
  filename: string;
  gcsPathOrContent: string;
}

export interface TestAnalysisJobData {
  testId: string;
  userId: string;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('pdf-ingestion') private pdfIngestionQueue: Queue,
    @InjectQueue('flashcard-generation') private flashcardQueue: Queue,
    @InjectQueue('test-analysis') private testAnalysisQueue: Queue,
  ) {}

  async addPdfIngestionJob(data: PdfIngestionJobData) {
    const job = await this.pdfIngestionQueue.add('ingest-pdf', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        age: 3600, // Keep completed jobs for 1 hour
        count: 100,
      },
      removeOnFail: {
        age: 86400, // Keep failed jobs for 24 hours
      },
    });
    this.logger.log(`Queued PDF ingestion job ${job.id} for document ${data.documentId}`);
    return job;
  }

  async addFlashcardGenerationJob(data: FlashcardGenerationJobData) {
    const job = await this.flashcardQueue.add('generate-flashcards', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        age: 3600,
        count: 100,
      },
      removeOnFail: {
        age: 86400,
      },
    });
    this.logger.log(`Queued flashcard generation job ${job.id} for PDF ${data.pdfId}`);
    return job;
  }

  async addTestAnalysisJob(data: TestAnalysisJobData) {
    const job = await this.testAnalysisQueue.add('analyze-test', data, {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: {
        age: 3600,
        count: 100,
      },
      removeOnFail: {
        age: 86400,
      },
    });
    this.logger.log(`Queued test analysis job ${job.id} for test ${data.testId}`);
    return job;
  }

  async getJob(queueName: string, jobId: string) {
    let queue: Queue;
    switch (queueName) {
      case 'pdf-ingestion':
        queue = this.pdfIngestionQueue;
        break;
      case 'flashcard-generation':
        queue = this.flashcardQueue;
        break;
      case 'test-analysis':
        queue = this.testAnalysisQueue;
        break;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }
    return queue.getJob(jobId);
  }

  async getJobState(queueName: string, jobId: string) {
    const job = await this.getJob(queueName, jobId);
    if (!job) {
      return null;
    }

    const state = await job.getState();
    const progress = job.progress;
    const failedReason = job.failedReason;
    const returnvalue = job.returnvalue;

    return {
      id: job.id,
      state,
      progress,
      failedReason,
      returnvalue,
      attemptsMade: job.attemptsMade,
      data: job.data,
    };
  }
}
