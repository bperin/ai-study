import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { PdfIngestionProcessor } from './processors/pdf-ingestion.processor';
import { FlashcardGenerationProcessor } from './processors/flashcard-generation.processor';
import { TestAnalysisProcessor } from './processors/test-analysis.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { RagModule } from '../rag/rag.module';
import { PdfsModule } from '../pdfs/pdfs.module';
import { PdfStatusModule } from '../pdf-status.module';

@Module({
  imports: [BullModule.registerQueue({ name: 'pdf-ingestion' }, { name: 'flashcard-generation' }, { name: 'test-analysis' }), PrismaModule, RagModule, forwardRef(() => PdfsModule), PdfStatusModule],
  controllers: [QueueController],
  providers: [QueueService, PdfIngestionProcessor, FlashcardGenerationProcessor, TestAnalysisProcessor],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
