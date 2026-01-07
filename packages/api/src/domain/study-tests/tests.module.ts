import { Module } from '@nestjs/common';
import { TestsService } from './tests.service';
import { TestsController } from './tests.controller';
import { TestTakingController } from './test-taking.controller';
import { TestTakingService } from './test-taking.service';
import { LeaderboardService } from './leaderboard.service';
import { TestSessionsModule } from './test-sessions/test-sessions.module';
import { TestAttemptsController } from './test-attempts.controller';
import { TestAttemptsService } from './test-attempts.service';
import { DocumentsModule } from '../documents/documents.module';
import { TestsRepositoryModule } from './tests-repository.module';
import { DocumentsRepositoryModule } from '../documents/documents.repository.module';

@Module({
  imports: [TestsRepositoryModule, DocumentsRepositoryModule, TestSessionsModule, DocumentsModule],
  controllers: [TestsController, TestTakingController, TestAttemptsController],
  providers: [TestsService, LeaderboardService, TestTakingService, TestAttemptsService],
})
export class TestsModule {}
