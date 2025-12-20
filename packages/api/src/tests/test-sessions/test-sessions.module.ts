import { Module } from '@nestjs/common';
import { TestSessionsController } from './test-sessions.controller';
import { TestSessionsService } from './test-sessions.service';
import { PdfIngestService } from '../../pdf/pdf-ingest.service';
import { AiStudyPlanService } from '../../ai/ai-study-plan.service';
import { ToolCallingService } from '../../ai/tool-calling.service';
import { InMemorySessionStore } from './in-memory-session.store';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../../auth/auth.module';
import { PdfsRepositoryModule } from '../../pdfs/pdfs-repository.module';
import { TestsRepositoryModule } from '../tests-repository.module';

@Module({
  imports: [PrismaModule, AuthModule, PdfsRepositoryModule, TestsRepositoryModule],
  controllers: [TestSessionsController],
  providers: [TestSessionsService, PdfIngestService, AiStudyPlanService, ToolCallingService, InMemorySessionStore],
})
export class TestSessionsModule {}
