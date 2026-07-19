import Anthropic from "@anthropic-ai/sdk";
import { env } from "../config/env.js";
import type { RetrievedChunk } from "./vectorStore.js";

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

export type GeneratedAnswer = {
  answer: string;
  confidence: number;
  needsHuman: boolean;
  citations: string[];
};

const SYSTEM_PROMPT = `You are a customer support assistant. Answer ONLY using the provided context
chunks from the company's knowledge base. Do not use outside knowledge and do not guess.

Respond with a single JSON object, no prose outside it, matching this shape exactly:
{
  "answer": string,          // the reply to show the customer, concise and friendly
  "confidence": number,      // 0.0-1.0, how well the context supports this answer
  "needs_human": boolean,    // true if the question is out of scope, sensitive, or the context is insufficient
  "citations": string[]      // titles of the context chunks actually used
}

Rules:
- If the context does not contain the answer, set confidence low (<0.4), needs_human true, and
  answer should say you're connecting them with a human agent.
- Never fabricate policy details, prices, or dates not present in the context.
- Keep "answer" under 120 words.`;

function buildContextBlock(chunks: RetrievedChunk[]): string {
  return chunks
    .map((c, i) => `[${i + 1}] (${c.title}, relevance=${c.score.toFixed(2)})\n${c.text}`)
    .join("\n\n---\n\n");
}

export async function generateAnswer(
  question: string,
  history: { role: "user" | "assistant"; content: string }[],
  chunks: RetrievedChunk[]
): Promise<GeneratedAnswer> {
  const contextBlock = chunks.length
    ? buildContextBlock(chunks)
    : "(no relevant context found in knowledge base)";

  const userTurn = `Context:\n${contextBlock}\n\nCustomer question: ${question}`;

  const response = await anthropic.messages.create({
    model: env.CLAUDE_MODEL,
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: [
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: "user" as const, content: userTurn },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";

  return parseModelJson(raw);
}

function parseModelJson(raw: string): GeneratedAnswer {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const jsonText = jsonMatch ? jsonMatch[0] : raw;

  try {
    const parsed = JSON.parse(jsonText);
    return {
      answer: String(parsed.answer ?? "I'm not sure — let me connect you with a human agent."),
      confidence: clamp01(Number(parsed.confidence ?? 0)),
      needsHuman: Boolean(parsed.needs_human ?? true),
      citations: Array.isArray(parsed.citations) ? parsed.citations.map(String) : [],
    };
  } catch {
    return {
      answer: "I'm having trouble processing that — let me connect you with a human agent.",
      confidence: 0,
      needsHuman: true,
      citations: [],
    };
  }
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.min(1, Math.max(0, n));
}
