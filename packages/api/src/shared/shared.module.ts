import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { PdfTextService } from './services/pdf-text.service';

@Global()
@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [PdfTextService],
  exports: [PdfTextService],
})
export class SharedModule {}
