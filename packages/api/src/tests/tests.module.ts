import { Module } from '@nestjs/common';
import { TestsService } from './tests.service';
import { TestsController } from './tests.controller';
import { TestTakingController } from './test-taking.controller';
import { TestTakingService } from './test-taking.service';
import { LeaderboardService } from './leaderboard.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TestSessionsModule } from './test-sessions/test-sessions.module';
import { TestAttemptsController } from './test-attempts.controller';
import { TestAttemptsService } from './test-attempts.service';
import { PdfsModule } from '../pdfs/pdfs.module';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [PrismaModule, TestSessionsModule, PdfsModule, RagModule],
  controllers: [TestsController, TestTakingController, TestAttemptsController],
  providers: [TestsService, LeaderboardService, TestTakingService, TestAttemptsService],
})
export class TestsModule {}
