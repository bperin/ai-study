import { Module } from '@nestjs/common';
import { PdfStatusGateway } from './pdf-status.gateway';

@Module({
  providers: [PdfStatusGateway],
  exports: [PdfStatusGateway],
})
export class PdfStatusModule {}
