import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RagRepository } from './rag.repository';

@Module({
  imports: [PrismaModule],
  providers: [RagRepository],
  exports: [RagRepository],
})
export class RagRepositoryModule {}
