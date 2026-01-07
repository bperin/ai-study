import { Module, Global } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { DocumentsRepositoryModule } from '../documents/documents.repository.module';
import { GenAiModule } from '../../infrastructure/genai/genai.module';
import { FileSearchService } from './file-search.service';
import { GcsService } from './gcs.service';

@Global()
@Module({
  imports: [DocumentsRepositoryModule, GenAiModule],
  controllers: [UploadsController],
  providers: [UploadsService, FileSearchService, GcsService],
  exports: [FileSearchService, GcsService],
})
export class UploadsModule {}
