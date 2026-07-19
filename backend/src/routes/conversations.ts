import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAdmin } from "../middleware/auth.js";

export const conversationsRouter = Router();

const listQuerySchema = z.object({
  status: z.enum(["ACTIVE", "AUTO_RESOLVED", "ESCALATED", "CLOSED"]).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
});

conversationsRouter.get("/", requireAdmin, async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const conversations = await prisma.conversation.findMany({
      where: query.status ? { status: query.status } : undefined,
      orderBy: { updatedAt: "desc" },
      take: query.limit,
      include: { messages: { orderBy: { createdAt: "asc" } }, escalation: true },
    });
    res.json(conversations);
  } catch (err) {
    next(err);
  }
});

conversationsRouter.get("/:id", requireAdmin, async (req, res, next) => {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: req.params.id },
      include: { messages: { orderBy: { createdAt: "asc" } }, escalation: true },
    });
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    res.json(conversation);
  } catch (err) {
    next(err);
  }
});
