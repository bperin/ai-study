import { Module } from '@nestjs/common';
import { RagController } from './rag.controller';
import { IngestService } from './services/ingest.service';
import { PdfService } from './services/pdf.service';
import { ChunkService } from './services/chunk.service';
import { EmbedService } from './services/embed.service';
import { RetrieveService } from './services/retrieve.service';
import { RagService } from './services/rag.service';
import { GeminiService } from './services/gemini.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RagController],
  providers: [IngestService, PdfService, ChunkService, EmbedService, RetrieveService, RagService, GeminiService],
  exports: [IngestService, RetrieveService, RagService, ChunkService, EmbedService, PdfService],
})
export class RagModule {}
