import { Module } from '@nestjs/common';
import { TestSessionsController } from './test-sessions.controller';
import { TestSessionsService } from './test-sessions.service';
import { AiStudyPlanService } from '../../../shared/genai/ai-study-plan.service';
import { ToolCallingService } from '../../../shared/genai/tool-calling.service';
import { InMemorySessionStore } from './in-memory-session.store';
import { AuthModule } from '../../auth/auth.module';
import { DocumentsModule } from '../../documents/documents.module';
import { TestsRepositoryModule } from '../tests-repository.module';

@Module({
  imports: [AuthModule, DocumentsModule, TestsRepositoryModule],
  controllers: [TestSessionsController],
  providers: [TestSessionsService, AiStudyPlanService, ToolCallingService, InMemorySessionStore],
})
export class TestSessionsModule {}
