import { Module } from '@nestjs/common';
import { DocumentsRepository } from './documents.repository';

@Module({
  providers: [DocumentsRepository],
  exports: [DocumentsRepository],
})
export class DocumentsRepositoryModule {}
