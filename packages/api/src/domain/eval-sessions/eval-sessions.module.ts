import { Module } from '@nestjs/common';
import { EvalSessionsController } from './eval-sessions.controller';
import { EvalSessionsService } from './eval-sessions.service';
import { EvalSessionsRepository } from './eval-sessions.repository';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EvalSessionsController],
  providers: [EvalSessionsService, EvalSessionsRepository],
  exports: [EvalSessionsService],
})
export class EvalSessionsModule {}
