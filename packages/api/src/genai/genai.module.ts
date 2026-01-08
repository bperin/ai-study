import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DocumentIntentService } from './services/document-intent.service';
import { EvalPlanService } from './services/eval-plan.service';
import { EvalGenerationService } from './services/eval-generation.service';
import { TestAnalysisService } from './services/test-analysis.service';
import { TestHintService } from './services/test-hint.service';
import { ArtifactsModule } from '../domain/artifacts/artifacts.module';
import { EvalSessionsModule } from '../domain/eval-sessions/eval-sessions.module';

@Module({
  imports: [ConfigModule, ArtifactsModule, EvalSessionsModule],
  providers: [DocumentIntentService, EvalPlanService, EvalGenerationService, TestAnalysisService, TestHintService],
  exports: [DocumentIntentService, EvalPlanService, EvalGenerationService, TestAnalysisService, TestHintService],
})
export class GenAIModule {}
