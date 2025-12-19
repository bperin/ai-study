import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { ParallelGenerationService } from '../../ai/parallel-generation.service';
import { PdfStatusGateway } from '../../pdf-status.gateway';
import { FlashcardGenerationJobData } from '../queue.service';

@Processor('flashcard-generation')
export class FlashcardGenerationProcessor extends WorkerHost {
  private readonly logger = new Logger(FlashcardGenerationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly parallelGenerationService: ParallelGenerationService,
    private readonly pdfStatusGateway: PdfStatusGateway,
  ) {
    super();
  }

  async process(job: Job<FlashcardGenerationJobData>): Promise<any> {
    const { pdfId, sessionId, userId, userPrompt, filename, gcsPathOrContent } = job.data;

    this.logger.log(`Processing flashcard generation job ${job.id} for PDF ${pdfId}`);

    try {
      await job.updateProgress(10);

      await this.parallelGenerationService.generateFlashcardsParallel(userPrompt, pdfId, filename, gcsPathOrContent, userId);

      await job.updateProgress(90);

      if (sessionId && sessionId !== 'temp-session') {
        try {
          await this.prisma.pdfSession.update({
            where: { id: sessionId },
            data: { status: 'completed' },
          });
        } catch (updateError: any) {
          this.logger.warn(`Could not update session ${sessionId}: ${updateError.message}`);
        }
      }

      this.pdfStatusGateway.sendStatusUpdate(userId, { isGenerating: false, type: 'flashcards' });

      await job.updateProgress(100);

      this.logger.log(`Flashcard generation completed for PDF ${pdfId}`);

      return { pdfId, status: 'completed' };
    } catch (error: any) {
      this.pdfStatusGateway.sendStatusUpdate(userId, { isGenerating: false, type: 'flashcards' });
      this.logger.error(`Flashcard generation failed for PDF ${pdfId}: ${error.message}`);

      try {
        const questionsCount = await this.prisma.mcq.count({
          where: { objective: { pdfId } },
        });

        if (sessionId && sessionId !== 'temp-session') {
          await this.prisma.pdfSession.update({
            where: { id: sessionId },
            data: {
              status: questionsCount > 0 ? 'completed' : 'failed',
            },
          });
        }
      } catch (updateError: any) {
        this.logger.error(`Failed to update session status: ${updateError.message}`);
      }

      throw error;
    }
  }
}
