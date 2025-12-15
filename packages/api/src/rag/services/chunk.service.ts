import { Injectable } from '@nestjs/common';
import { sha256 } from '../util/hash';

export interface ChunkInput {
  chunkIndex: number;
  content: string;
  contentHash: string;
  startChar: number;
  endChar: number;
}

@Injectable()
export class ChunkService {
  private readonly chunkSize = 1200;
  private readonly overlap = 200;
  private readonly softBoundary = 200;

  chunkText(text: string): ChunkInput[] {
    if (!text || !text.trim()) {
      return [];
    }

    const normalized = text.replace(/\r\n/g, '\n');
    const chunks: ChunkInput[] = [];

    let start = 0;
    let chunkIndex = 0;

    while (start < normalized.length) {
      let end = Math.min(start + this.chunkSize, normalized.length);
      const boundaryStart = Math.max(start + this.chunkSize - this.softBoundary, start);
      const boundaryEnd = Math.min(start + this.chunkSize + this.softBoundary, normalized.length);
      const boundaryWindow = normalized.slice(boundaryStart, boundaryEnd);
      const splitAt = boundaryWindow.lastIndexOf('\n\n');

      if (splitAt !== -1) {
        const candidate = boundaryStart + splitAt;
        if (candidate > start) {
          end = candidate;
        }
      }

      if (end <= start) {
        end = Math.min(start + this.chunkSize, normalized.length);
      }

      const content = normalized.slice(start, end);
      chunks.push({
        chunkIndex,
        content,
        contentHash: sha256(content),
        startChar: start,
        endChar: end,
      });

      if (end >= normalized.length) {
        break;
      }

      start = Math.max(end - this.overlap, start + 1);
      chunkIndex += 1;
    }

    return chunks;
  }
}
