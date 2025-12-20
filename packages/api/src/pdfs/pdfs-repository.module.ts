import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PdfsRepository } from './pdfs.repository';

@Module({
  imports: [PrismaModule],
  providers: [PdfsRepository],
  exports: [PdfsRepository],
})
export class PdfsRepositoryModule {}
