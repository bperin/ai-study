const tokenizer = /[^a-zA-Z0-9]+/;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(tokenizer)
    .map((t) => t.trim())
    .filter(Boolean);
}

export function keywordScore(question: string, chunk: string): number {
  const qTokens = tokenize(question);
  const chunkTokens = tokenize(chunk);
  const chunkSet = new Set(chunkTokens);

  let score = 0;
  for (const token of qTokens) {
    if (chunkSet.has(token)) {
      score += 1;
    }
  }

  // Phrase/adjacent token boost
  for (let i = 0; i < qTokens.length - 1; i++) {
    const phrase = `${qTokens[i]} ${qTokens[i + 1]}`;
    if (phrase.trim().length > 0 && chunk.toLowerCase().includes(phrase)) {
      score += 2;
    }
  }

  // Longer questions should have slightly higher base weight
  score += Math.min(qTokens.length / 10, 1);

  return score;
}

export function limitContextByLength<T extends { content: string }>(chunks: T[], maxLength = 24000): T[] {
  let total = 0;
  const selected: T[] = [];
  for (const chunk of chunks) {
    const proposed = total + chunk.content.length;
    if (proposed > maxLength && selected.length > 0) {
      break;
    }
    total = proposed;
    selected.push(chunk);
  }
  return selected;
}
