import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GcsService } from './gcs.service';
import { FileSearchService } from './file-search.service';
import { DocumentsModule } from '../documents/documents.module';
import { GenAIModule } from '../../genai/genai.module';

@Module({
  imports: [
    ConfigModule,
    DocumentsModule,
    GenAIModule,
  ],
  providers: [
    GcsService,
    FileSearchService,
  ],
  exports: [
    GcsService,
    FileSearchService,
  ],
})
export class UploadsModule {}
