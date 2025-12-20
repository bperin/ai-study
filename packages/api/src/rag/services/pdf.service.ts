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
      
      // Basic check: if text is empty or extremely short relative to page count
      // it's likely an image-only PDF (scanned)
      if (!text || text.length < 50) {
        throw new Error('No extractable text found. This might be a scanned image PDF (OCR not supported yet) or a protected document.');
      }
      
      // Check for low text density (too much whitespace/garbage)
      // Remove all whitespace and check length
      const denseText = text.replace(/\s/g, '');
      if (denseText.length < 20) {
         throw new Error('Document contains insufficient text for processing. Scanned images are not supported.');
      }

      return text;
    } catch (error: any) {
      // Propagate our specific errors, wrap others
      if (error.message.includes('No extractable text') || error.message.includes('insufficient text')) {
        throw error;
      }
      this.logger.error('Failed to parse PDF', error as Error);
      throw error;
    }
  }
}
