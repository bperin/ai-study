import { Injectable } from '@nestjs/common';
import { DocumentsRepository } from '../documents/documents.repository';

@Injectable()
export class DocumentIngestService {
  constructor(private readonly documentsRepository: DocumentsRepository) {}

  async registerLinkedDocument(params: { userId: string; filename: string; signedUrl: string }) {
    const { userId, filename, signedUrl } = params;
    return this.documentsRepository.createDocument(userId, filename, null, `Linked upload at ${signedUrl}`);
  }
}
