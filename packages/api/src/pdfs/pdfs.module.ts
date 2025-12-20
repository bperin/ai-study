import { Module, forwardRef } from '@nestjs/common';
import { PdfsController } from './pdfs.controller';
import { PdfsService } from './pdfs.service';
import { GeminiService } from '../ai/gemini.service';
import { ParallelGenerationService } from '../ai/parallel-generation.service';
import { PdfTextService } from './pdf-text.service';
import { GcsService } from './gcs.service';
import { RagModule } from '../rag/rag.module';
import { PdfStatusModule } from '../pdf-status.module';
import { UsersModule } from '../users/users.module';
import { PdfsRepositoryModule } from './pdfs-repository.module';
import { TestsRepositoryModule } from '../tests/tests-repository.module';

@Module({
  imports: [PdfsRepositoryModule, TestsRepositoryModule, RagModule, PdfStatusModule, UsersModule],
  controllers: [PdfsController],
  providers: [PdfsService, GeminiService, ParallelGenerationService, PdfTextService, GcsService],
  exports: [PdfsService, GcsService, PdfTextService, ParallelGenerationService, PdfsRepositoryModule],
})
export class PdfsModule {}
