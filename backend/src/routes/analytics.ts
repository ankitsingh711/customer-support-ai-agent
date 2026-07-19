import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAdmin } from "../middleware/auth.js";

export const analyticsRouter = Router();

analyticsRouter.get("/summary", requireAdmin, async (_req, res, next) => {
  try {
    const [total, autoResolved, escalated, events] = await Promise.all([
      prisma.conversation.count(),
      prisma.conversation.count({ where: { status: "AUTO_RESOLVED" } }),
      prisma.conversation.count({ where: { status: "ESCALATED" } }),
      prisma.analyticsEvent.findMany({
        where: { type: "chat_turn" },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
    ]);

    const avgLatencyMs = events.length
      ? Math.round(events.reduce((sum, e) => sum + (e.latencyMs ?? 0), 0) / events.length)
      : 0;

    const resolutionRate = total > 0 ? autoResolved / total : 0;

    res.json({
      totalConversations: total,
      autoResolved,
      escalated,
      resolutionRate,
      avgLatencyMs,
    });
  } catch (err) {
    next(err);
  }
});

analyticsRouter.get("/unanswered", requireAdmin, async (_req, res, next) => {
  try {
    const lowConfidenceMessages = await prisma.message.findMany({
      where: { role: "ASSISTANT", confidence: { lt: 0.55 } },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: { conversation: { include: { messages: { take: 1, orderBy: { createdAt: "asc" } } } } },
    });

    res.json(
      lowConfidenceMessages.map((m) => ({
        conversationId: m.conversationId,
        question: m.conversation.messages[0]?.content ?? null,
        confidence: m.confidence,
        createdAt: m.createdAt,
      }))
    );
  } catch (err) {
    next(err);
  }
});
