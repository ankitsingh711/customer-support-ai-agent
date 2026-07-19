import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAdmin } from "../middleware/auth.js";
import { chunkMarkdown, extractTitle } from "../services/ingestionService.js";
import { embeddingService } from "../services/embeddingService.js";
import { vectorStore } from "../services/vectorStore.js";

export const kbRouter = Router();

const uploadSchema = z.object({
  title: z.string().min(1).optional(),
  sourcePath: z.string().min(1),
  content: z.string().min(1),
});

kbRouter.get("/", requireAdmin, async (_req, res, next) => {
  try {
    const docs = await prisma.kbDocument.findMany({ orderBy: { updatedAt: "desc" } });
    res.json(docs);
  } catch (err) {
    next(err);
  }
});

kbRouter.post("/", requireAdmin, async (req, res, next) => {
  try {
    const body = uploadSchema.parse(req.body);
    const title = body.title ?? extractTitle(body.content, body.sourcePath);
    const chunks = chunkMarkdown(body.content);

    const vectors = await embeddingService.embedDocuments(chunks);
    await vectorStore.upsertChunks(
      chunks.map((text, i) => ({ text, source: body.sourcePath, title, chunkIndex: i })),
      vectors
    );

    const existing = await prisma.kbDocument.findFirst({ where: { sourcePath: body.sourcePath } });
    const doc = existing
      ? await prisma.kbDocument.update({
          where: { id: existing.id },
          data: { title, chunkCount: chunks.length },
        })
      : await prisma.kbDocument.create({
          data: { title, sourcePath: body.sourcePath, chunkCount: chunks.length },
        });

    res.status(201).json(doc);
  } catch (err) {
    next(err);
  }
});
