import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { RepositoryModule } from '../shared/repositories/repository.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [RepositoryModule, QueueModule],
  controllers: [UploadsController],
  providers: [UploadsService],
})
export class UploadsModule {}
