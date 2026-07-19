import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAdmin } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";

export const escalationsRouter = Router();

escalationsRouter.get("/", requireAdmin, async (_req, res, next) => {
  try {
    const escalations = await prisma.escalation.findMany({
      where: { resolvedAt: null },
      orderBy: { createdAt: "desc" },
      include: { conversation: { include: { messages: { orderBy: { createdAt: "asc" } } } } },
    });
    res.json(escalations);
  } catch (err) {
    next(err);
  }
});

escalationsRouter.post("/:id/resolve", requireAdmin, async (req, res, next) => {
  try {
    const escalation = await prisma.escalation.findUnique({ where: { id: req.params.id } });
    if (!escalation) {
      throw new HttpError(404, "Escalation not found");
    }

    const [updated] = await prisma.$transaction([
      prisma.escalation.update({
        where: { id: req.params.id },
        data: { resolvedAt: new Date() },
      }),
      prisma.conversation.update({
        where: { id: escalation.conversationId },
        data: { status: "CLOSED" },
      }),
    ]);

    res.json(updated);
  } catch (err) {
    next(err);
  }
});
