const MAX_CHUNK_CHARS = 1200;

/**
 * Splits markdown into chunks along heading boundaries, then further
 * splits any oversized section by paragraph so no chunk exceeds MAX_CHUNK_CHARS.
 */
export function chunkMarkdown(markdown: string): string[] {
  const sections = markdown
    .split(/\n(?=#{1,3}\s)/g)
    .map((s) => s.trim())
    .filter(Boolean);

  const chunks: string[] = [];

  for (const section of sections) {
    if (section.length <= MAX_CHUNK_CHARS) {
      chunks.push(section);
      continue;
    }

    const heading = section.match(/^#{1,3}\s.*$/m)?.[0] ?? "";
    const paragraphs = section.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

    let buffer = heading;
    for (const paragraph of paragraphs) {
      if (paragraph === heading) continue;
      if ((buffer + "\n\n" + paragraph).length > MAX_CHUNK_CHARS && buffer !== heading) {
        chunks.push(buffer);
        buffer = heading;
      }
      buffer += "\n\n" + paragraph;
    }
    if (buffer.trim() !== heading) chunks.push(buffer);
  }

  return chunks.filter((c) => c.trim().length > 0);
}

export function extractTitle(markdown: string, fallback: string): string {
  const match = markdown.match(/^#\s+(.*)$/m);
  return match ? match[1].trim() : fallback;
}
