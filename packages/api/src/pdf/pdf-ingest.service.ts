import { Injectable } from '@nestjs/common';
import { PdfsRepository } from '../pdfs/pdfs.repository';

@Injectable()
export class PdfIngestService {
  constructor(private readonly pdfsRepository: PdfsRepository) {}

  async registerLinkedPdf(params: { userId: string; filename: string; signedUrl: string }) {
    const { userId, filename, signedUrl } = params;
    return this.pdfsRepository.createPdf(userId, filename, null, `Linked upload at ${signedUrl}`);
  }
}
