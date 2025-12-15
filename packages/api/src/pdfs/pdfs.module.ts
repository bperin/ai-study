import { Module, forwardRef } from '@nestjs/common';
import { PdfsController } from './pdfs.controller';
import { PdfsService } from './pdfs.service';
import { GeminiService } from '../ai/gemini.service';
import { ParallelGenerationService } from '../ai/parallel-generation.service';
import { PdfTextService } from './pdf-text.service';
import { GcsService } from './gcs.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RagModule } from '../rag/rag.module';
import { PdfStatusModule } from '../pdf-status.module';

@Module({
  imports: [PrismaModule, RagModule, PdfStatusModule],
  controllers: [PdfsController],
  providers: [PdfsService, GeminiService, ParallelGenerationService, PdfTextService, GcsService],
  exports: [PdfsService, GcsService, PdfTextService, ParallelGenerationService],
})
export class PdfsModule {}
