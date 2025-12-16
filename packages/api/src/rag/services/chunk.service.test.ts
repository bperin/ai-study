import { ChunkService } from './chunk.service';

describe('ChunkService', () => {
  const service = new ChunkService();

  it('creates overlapping chunks at the configured size', () => {
    const text = 'a'.repeat(1500);
    const chunks = service.chunkText(text);

    expect(chunks).toHaveLength(2);
    expect(chunks[0].content.length).toBe(1200);
    expect(chunks[1].startChar).toBe(chunks[0].endChar - 200);
    expect(chunks[1].endChar - chunks[1].startChar).toBe(500);
  });

  it('prefers splitting on double newlines near the boundary', () => {
    const text = `${'a'.repeat(1190)}\n\n${'b'.repeat(800)}`;
    const chunks = service.chunkText(text);

    expect(chunks[0].content.length).toBe(1190);
    expect(chunks[0].endChar).toBe(1190);
    expect(chunks[1].startChar).toBe(chunks[0].endChar - 200);
  });
});
