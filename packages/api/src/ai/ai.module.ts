import { Module, Global } from '@nestjs/common';
import { AdkRunnerService } from './adk-runner.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PdfsModule } from '../pdfs/pdfs.module';

@Global()
@Module({
  imports: [PrismaModule, PdfsModule],
  providers: [AdkRunnerService],
  exports: [AdkRunnerService],
})
export class AiModule {}
