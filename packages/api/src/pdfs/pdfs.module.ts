import { Module, forwardRef } from '@nestjs/common';
import { PdfsController } from './pdfs.controller';
import { PdfsService } from './pdfs.service';
import { GeminiService } from '../ai/gemini.service';
import { ParallelGenerationService } from '../ai/parallel-generation.service';
import { GcsService } from './gcs.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RagModule } from '../rag/rag.module';
import { PdfStatusModule } from '../pdf-status.module';

@Module({
  imports: [PrismaModule, RagModule, PdfStatusModule],
  controllers: [PdfsController],
  providers: [PdfsService, GeminiService, ParallelGenerationService, GcsService],
  exports: [PdfsService, GcsService, ParallelGenerationService],
})
export class PdfsModule {}
