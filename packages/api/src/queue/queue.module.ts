import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { TestAnalysisProcessor } from './processors/test-analysis.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { DocumentsModule } from '../documents/documents.module';
import { PdfStatusModule } from '../pdf-status.module';

@Module({
  imports: [BullModule.registerQueue({ name: 'test-analysis' }), PrismaModule, forwardRef(() => DocumentsModule), PdfStatusModule],
  controllers: [QueueController],
  providers: [QueueService, TestAnalysisProcessor],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
