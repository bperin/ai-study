import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DocumentIntentService } from './services/document-intent.service';
import { ArtifactsModule } from '../domain/artifacts/artifacts.module';

@Module({
  imports: [
    ConfigModule,
    ArtifactsModule,
  ],
  providers: [
    DocumentIntentService,
  ],
  exports: [
    DocumentIntentService,
  ],
})
export class GenAIModule {}
