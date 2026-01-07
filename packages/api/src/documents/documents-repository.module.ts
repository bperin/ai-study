import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DocumentsRepository } from './documents.repository';

@Module({
  imports: [PrismaModule],
  providers: [DocumentsRepository],
  exports: [DocumentsRepository],
})
export class DocumentsRepositoryModule {}
