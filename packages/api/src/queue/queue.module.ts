import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { PdfIngestionProcessor } from './processors/pdf-ingestion.processor';
import { FlashcardGenerationProcessor } from './processors/flashcard-generation.processor';
import { TestAnalysisProcessor } from './processors/test-analysis.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { RagModule } from '../rag/rag.module';
import { AiModule } from '../ai/ai.module';
import { PdfStatusModule } from '../pdf-status.module';

@Global()
@Module({
  imports: [
    PrismaModule,
    RagModule,
    AiModule,
    PdfStatusModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: null,
      },
    }),
    BullModule.registerQueue(
      { name: 'pdf-ingestion' },
      { name: 'flashcard-generation' },
      { name: 'test-analysis' },
    ),
  ],
  controllers: [QueueController],
  providers: [
    QueueService,
    PdfIngestionProcessor,
    FlashcardGenerationProcessor,
    TestAnalysisProcessor,
  ],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
