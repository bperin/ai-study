import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PdfTextService } from '../pdfs/pdf-text.service';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [PrismaModule, RagModule],
  controllers: [UploadsController],
  providers: [UploadsService, PdfTextService],
})
export class UploadsModule {}
