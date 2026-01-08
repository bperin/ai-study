import { Module } from '@nestjs/common';
import { TestsService } from './tests.service';
import { TestsController } from './tests.controller';
import { LeaderboardService } from './leaderboard.service';
import { DocumentsModule } from '../documents/documents.module';
import { TestsRepositoryModule } from './tests-repository.module';
import { DocumentsRepositoryModule } from '../documents/documents.repository.module';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [TestsRepositoryModule, DocumentsRepositoryModule, DocumentsModule, UploadsModule],
  controllers: [TestsController],
  providers: [TestsService, LeaderboardService],
})
export class TestsModule {}
