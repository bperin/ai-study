import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { PdfTextService } from '../pdfs/pdf-text.service';
import { RagModule } from '../rag/rag.module';
import { PdfsRepositoryModule } from '../pdfs/pdfs-repository.module';

@Module({
  imports: [PdfsRepositoryModule, RagModule],
  controllers: [UploadsController],
  providers: [UploadsService, PdfTextService],
})
export class UploadsModule {}
