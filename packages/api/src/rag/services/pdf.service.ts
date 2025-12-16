import { Injectable, Logger } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdf = require('pdf-parse');

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async extractText(buffer: Buffer): Promise<string> {
    try {
      const data = await pdf(buffer);
      const text = data.text?.trim();
      if (!text) {
        throw new Error('No extractable text');
      }
      return text;
    } catch (error) {
      this.logger.error('Failed to parse PDF', error as Error);
      throw error;
    }
  }
}
