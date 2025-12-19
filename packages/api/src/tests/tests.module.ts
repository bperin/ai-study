import { Module, forwardRef } from '@nestjs/common';
import { TestsService } from './tests.service';
import { TestsController } from './tests.controller';
import { TestTakingController } from './test-taking.controller';
import { TestTakingService } from './test-taking.service';
import { LeaderboardService } from './leaderboard.service';
import { RepositoryModule } from '../shared/repositories/repository.module';
import { TestSessionsModule } from './test-sessions/test-sessions.module';
import { TestAttemptsController } from './test-attempts.controller';
import { TestAttemptsService } from './test-attempts.service';
import { PdfsModule } from '../pdfs/pdfs.module';
import { RagModule } from '../rag/rag.module';
import { AiModule } from '../ai/ai.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [RepositoryModule, TestSessionsModule, PdfsModule, RagModule, AiModule, forwardRef(() => QueueModule)],
  controllers: [TestsController, TestTakingController, TestAttemptsController],
  providers: [TestsService, LeaderboardService, TestTakingService, TestAttemptsService],
})
export class TestsModule {}
