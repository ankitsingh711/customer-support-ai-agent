import { describe, expect, it } from "vitest";
import { chunkMarkdown, extractTitle } from "../src/services/ingestionService.js";

describe("extractTitle", () => {
  it("extracts the first H1 heading", () => {
    const md = "# What's your refund policy?\n\nSome body text.";
    expect(extractTitle(md, "fallback.md")).toBe("What's your refund policy?");
  });

  it("falls back when there is no heading", () => {
    expect(extractTitle("just body text", "fallback.md")).toBe("fallback.md");
  });
});

describe("chunkMarkdown", () => {
  it("splits into one chunk per heading section when under the size limit", () => {
    const md = "# Title\n\nintro\n\n## Section A\n\nbody A\n\n## Section B\n\nbody B";
    const chunks = chunkMarkdown(md);
    expect(chunks).toHaveLength(3);
    expect(chunks[1]).toContain("Section A");
    expect(chunks[2]).toContain("Section B");
  });

  it("splits an oversized section into multiple chunks by paragraph", () => {
    const longParagraph = "word ".repeat(400); // ~2000 chars, over the 1200 char limit
    const md = `## Big Section\n\n${longParagraph}\n\n${longParagraph}`;
    const chunks = chunkMarkdown(md);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(1200 + longParagraph.length);
    }
  });

  it("never returns empty chunks", () => {
    const md = "# Title\n\n\n\n## Empty\n\n\n\n## Real\n\ncontent here";
    const chunks = chunkMarkdown(md);
    expect(chunks.every((c) => c.trim().length > 0)).toBe(true);
  });
});
