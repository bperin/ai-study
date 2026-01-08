import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { PdfStatusModule } from '../../pdf-status.module';
import { UsersModule } from '../users/users.module';
import { DocumentsRepositoryModule } from './documents.repository.module';
import { TestsRepositoryModule } from '../study-tests/tests-repository.module';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [DocumentsRepositoryModule, TestsRepositoryModule, PdfStatusModule, UsersModule, UploadsModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService, DocumentsRepositoryModule],
})
export class DocumentsModule {}
