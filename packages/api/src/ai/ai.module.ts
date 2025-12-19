import { Module, Global } from '@nestjs/common';
import { AdkRunnerService } from './adk-runner.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [AdkRunnerService],
  exports: [AdkRunnerService],
})
export class AiModule {}
