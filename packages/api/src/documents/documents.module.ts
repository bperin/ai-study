import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { GcsService } from '../uploads/gcs.service';
import { PdfStatusModule } from '../pdf-status.module';
import { UsersModule } from '../users/users.module';
import { DocumentsRepositoryModule } from './documents-repository.module';
import { TestsRepositoryModule } from '../tests/tests-repository.module';

@Module({
  imports: [DocumentsRepositoryModule, TestsRepositoryModule, PdfStatusModule, UsersModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService, DocumentsRepositoryModule],
})
export class DocumentsModule {}
