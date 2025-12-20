import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TestsRepository } from './tests.repository';

@Module({
  imports: [PrismaModule],
  providers: [TestsRepository],
  exports: [TestsRepository],
})
export class TestsRepositoryModule {}
