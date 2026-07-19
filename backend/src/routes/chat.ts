import { Router } from "express";
import { z } from "zod";
import { handleChatTurn } from "../services/ragService.js";
import { logger } from "../lib/logger.js";

export const chatRouter = Router();

const chatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
});

chatRouter.post("/", async (req, res, next) => {
  try {
    const body = chatRequestSchema.parse(req.body);
    const result = await handleChatTurn(body.message, body.conversationId, body.customerId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * SSE variant: computes the full answer via the same RAG pipeline, then streams it
 * to the client in small text deltas so the UI can render a "typing" effect.
 * (Token-level streaming from Claude is a natural next step once the JSON contract
 * above is replaced with tool-use/streaming — see README roadmap.)
 */
chatRouter.get("/stream", async (req, res, next) => {
  try {
    const parsed = chatRequestSchema.safeParse({
      message: req.query.message,
      conversationId: req.query.conversationId || undefined,
      customerId: req.query.customerId || undefined,
    });

    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const result = await handleChatTurn(
      parsed.data.message,
      parsed.data.conversationId,
      parsed.data.customerId
    );

    res.write(
      `event: meta\ndata: ${JSON.stringify({
        conversationId: result.conversationId,
        confidence: result.confidence,
        escalated: result.escalated,
        citations: result.citations,
      })}\n\n`
    );

    const words = result.answer.split(" ");
    for (const word of words) {
      res.write(`event: delta\ndata: ${JSON.stringify({ text: word + " " })}\n\n`);
      await new Promise((r) => setTimeout(r, 25));
    }

    res.write(`event: done\ndata: {}\n\n`);
    res.end();
  } catch (err) {
    logger.error({ err }, "chat stream failed");
    if (res.headersSent) {
      // Named "stream_error", not "error" — EventSource treats a server-sent
      // event literally named "error" as equivalent to a connection failure.
      res.write(
        `event: stream_error\ndata: ${JSON.stringify({ message: "Failed to generate a response." })}\n\n`
      );
      res.end();
      return;
    }
    next(err);
  }
});
