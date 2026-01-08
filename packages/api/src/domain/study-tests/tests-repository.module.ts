import { Module } from '@nestjs/common';
import { TestsRepository } from './tests.repository';

@Module({
  providers: [TestsRepository],
  exports: [TestsRepository],
})
export class TestsRepositoryModule {}
