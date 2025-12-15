import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PdfTextService } from '../pdfs/pdf-text.service';

@Module({
  imports: [PrismaModule],
  controllers: [UploadsController],
  providers: [UploadsService, PdfTextService],
})
export class UploadsModule {}
