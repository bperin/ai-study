import { Injectable } from "@nestjs/common";
import * as pdfParse from "pdf-parse";

export interface ExtractedPdfContent {
    text: string;
    structuredText: string;
    pageCount: number;
    metadata: any;
}

@Injectable()
export class PdfTextService {
    /**
     * Extract and clean text from PDF buffer
     * This improves upon raw pdf-parse by:
     * 1. Cleaning up excessive whitespace
     * 2. Preserving paragraph structure
     * 3. Removing page headers/footers patterns
     * 4. Normalizing line breaks
     */
    async extractText(buffer: Buffer): Promise<ExtractedPdfContent> {
        const data = await pdfParse(buffer);

        // Get raw text
        const rawText = data.text;

        // Clean and structure the text
        const structuredText = this.cleanAndStructureText(rawText);

        return {
            text: rawText,
            structuredText,
            pageCount: data.numpages,
            metadata: data.info,
        };
    }

    /**
     * Clean and structure PDF text for better AI processing
     */
    private cleanAndStructureText(text: string): string {
        let cleaned = text;

        // 1. Normalize line breaks (convert multiple newlines to double newline for paragraphs)
        cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

        // 2. Remove excessive spaces
        cleaned = cleaned.replace(/ {2,}/g, " ");

        // 3. Fix hyphenated words at line breaks
        cleaned = cleaned.replace(/(\w+)-\n(\w+)/g, "$1$2");

        // 4. Remove common page header/footer patterns
        // Pattern: Page X of Y, Page X, etc.
        cleaned = cleaned.replace(/\n\s*Page\s+\d+(\s+of\s+\d+)?\s*\n/gi, "\n");
        cleaned = cleaned.replace(/\n\s*\d+\s*\n/g, "\n"); // Standalone page numbers

        // 5. Remove common footer patterns (copyright, dates at line start)
        cleaned = cleaned.replace(/\n\s*©.*?\d{4}.*?\n/g, "\n");
        cleaned = cleaned.replace(/\n\s*Copyright.*?\n/gi, "\n");

        // 6. Preserve bullet points and numbered lists
        cleaned = cleaned.replace(/\n\s*([•·○▪▫-])\s+/g, "\n$1 ");
        cleaned = cleaned.replace(/\n\s*(\d+\.)\s+/g, "\n$1 ");

        // 7. Join lines that are part of the same paragraph
        // (lines that don't end with punctuation and next line doesn't start with capital/number/bullet)
        cleaned = cleaned.replace(/([a-z,])\n([a-z])/g, "$1 $2");

        // 8. Trim each line
        cleaned = cleaned
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .join("\n");

        // 9. Final cleanup: ensure proper paragraph spacing
        cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

        return cleaned.trim();
    }

    /**
     * Extract text in chunks for large PDFs
     * Useful for RAG or when content exceeds context window
     */
    async extractTextInChunks(buffer: Buffer, chunkSize: number = 10000): Promise<string[]> {
        const { structuredText } = await this.extractText(buffer);

        const chunks: string[] = [];
        const paragraphs = structuredText.split("\n\n");

        let currentChunk = "";

        for (const paragraph of paragraphs) {
            // If adding this paragraph would exceed chunk size, save current chunk
            if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
                chunks.push(currentChunk.trim());
                currentChunk = "";
            }

            // Add paragraph to current chunk
            currentChunk += paragraph + "\n\n";
        }

        // Add final chunk
        if (currentChunk.trim().length > 0) {
            chunks.push(currentChunk.trim());
        }

        return chunks;
    }

    /**
     * Get a summary-friendly version of the PDF (first N characters of structured text)
     */
    async extractSummary(buffer: Buffer, maxLength: number = 50000): Promise<string> {
        const { structuredText } = await this.extractText(buffer);

        if (structuredText.length <= maxLength) {
            return structuredText;
        }

        // Try to cut at a paragraph boundary
        const truncated = structuredText.substring(0, maxLength);
        const lastParagraph = truncated.lastIndexOf("\n\n");

        if (lastParagraph > maxLength * 0.8) {
            // If we can cut at a paragraph boundary without losing too much
            return truncated.substring(0, lastParagraph);
        }

        // Otherwise just truncate
        return truncated + "\n\n[Content truncated...]";
    }
}
