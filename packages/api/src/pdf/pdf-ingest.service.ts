import { Injectable } from '@nestjs/common';
import { PdfsRepository } from '../pdfs/pdfs.repository';
import { CreatePdfRecordDto } from '../pdfs/dto/create-pdf-record.dto';

@Injectable()
export class PdfIngestService {
  constructor(private readonly pdfsRepository: PdfsRepository) {}

  async registerLinkedPdf(params: { userId: string; filename: string; signedUrl: string }) {
    const { userId, filename, signedUrl } = params;
    const dto = new CreatePdfRecordDto();
    dto.userId = userId;
    dto.filename = filename;
    dto.content = `Linked upload at ${signedUrl}`;
    return this.pdfsRepository.createPdf(dto);
  }
}
