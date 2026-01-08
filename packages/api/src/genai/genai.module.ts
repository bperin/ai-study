import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DocumentIntentService } from './services/document-intent.service';
import { EvalPlanService } from './services/eval-plan.service';
import { ArtifactsModule } from '../domain/artifacts/artifacts.module';
import { EvalSessionsModule } from '../domain/eval-sessions/eval-sessions.module';

@Module({
  imports: [
    ConfigModule,
    ArtifactsModule,
    EvalSessionsModule,
  ],
  providers: [
    DocumentIntentService,
    EvalPlanService,
  ],
  exports: [
    DocumentIntentService,
    EvalPlanService,
  ],
})
export class GenAIModule {}
