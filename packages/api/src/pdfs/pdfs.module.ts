import { Module, forwardRef } from '@nestjs/common';
import { PdfsController } from './pdfs.controller';
import { PdfsService } from './pdfs.service';
import { GeminiService } from '../ai/gemini.service';
import { ParallelGenerationService } from '../ai/parallel-generation.service';
import { GcsService } from './gcs.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RagModule } from '../rag/rag.module';
import { PdfStatusModule } from '../pdf-status.module';
import { SharedModule } from '../shared/shared.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [PrismaModule, RagModule, PdfStatusModule, SharedModule, forwardRef(() => QueueModule)],
  controllers: [PdfsController],
  providers: [PdfsService, GeminiService, ParallelGenerationService, GcsService],
  exports: [PdfsService, GcsService, ParallelGenerationService],
})
export class PdfsModule {}
