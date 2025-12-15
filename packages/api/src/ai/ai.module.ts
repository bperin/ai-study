import { Module, Global } from '@nestjs/common';
import { AdkRunnerService } from './adk-runner.service';
import { ParallelGenerationService } from './parallel-generation.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PdfsModule } from '../pdfs/pdfs.module';

@Global()
@Module({
  imports: [PrismaModule, PdfsModule],
  providers: [AdkRunnerService, ParallelGenerationService],
  exports: [AdkRunnerService, ParallelGenerationService],
})
export class AiModule {}
