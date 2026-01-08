import { Module, Global } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { GcsService } from './gcs.service';
import { DocumentsRepositoryModule } from '../documents/documents.repository.module';
import { GenAiModule } from '../../infrastructure/genai/genai.module';
import { FileSearchService } from './file-search.service';


@Global()
@Module({
  imports: [DocumentsRepositoryModule, GenAiModule],
  controllers: [UploadsController],
  providers: [FileSearchService, GcsService],
  exports: [FileSearchService, GcsService],
})
export class UploadsModule {}
