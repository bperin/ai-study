import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PdfIngestService {
  constructor(private readonly prisma: PrismaService) {}

  async registerLinkedPdf(params: { userId: string; filename: string; signedUrl: string }) {
    const { userId, filename, signedUrl } = params;
    return this.prisma.pdf.create({
      data: {
        userId,
        filename,
        content: `Linked upload at ${signedUrl}`,
      },
    });
  }
}
