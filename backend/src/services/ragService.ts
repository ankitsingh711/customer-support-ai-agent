import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import { embeddingService } from "./embeddingService.js";
import { vectorStore } from "./vectorStore.js";
import { generateAnswer } from "./claudeService.js";

export type ChatTurnResult = {
  conversationId: string;
  answer: string;
  confidence: number;
  escalated: boolean;
  citations: string[];
};

export function shouldEscalate(
  confidence: number,
  needsHuman: boolean,
  threshold: number
): boolean {
  return needsHuman || confidence < threshold;
}

export async function handleChatTurn(
  message: string,
  conversationId: string | undefined,
  customerId: string | undefined
): Promise<ChatTurnResult> {
  const startedAt = Date.now();

  const conversation = conversationId
    ? await prisma.conversation.findUniqueOrThrow({ where: { id: conversationId } })
    : await prisma.conversation.create({ data: { customerId: customerId ?? null } });

  const priorMessages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  await prisma.message.create({
    data: { conversationId: conversation.id, role: "CUSTOMER", content: message },
  });

  const queryVector = await embeddingService.embedQuery(message);
  const chunks = await vectorStore.search(queryVector, env.RETRIEVAL_TOP_K);

  const history = priorMessages.map((m) => ({
    role: m.role === "CUSTOMER" ? ("user" as const) : ("assistant" as const),
    content: m.content,
  }));

  const generated = await generateAnswer(message, history, chunks);

  const escalated = shouldEscalate(
    generated.confidence,
    generated.needsHuman,
    env.CONFIDENCE_ESCALATION_THRESHOLD
  );

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      role: "ASSISTANT",
      content: generated.answer,
      citations: generated.citations,
      confidence: generated.confidence,
    },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { status: escalated ? "ESCALATED" : "AUTO_RESOLVED" },
  });

  if (escalated) {
    await prisma.escalation.upsert({
      where: { conversationId: conversation.id },
      create: {
        conversationId: conversation.id,
        reason:
          generated.confidence < env.CONFIDENCE_ESCALATION_THRESHOLD
            ? "low_confidence"
            : "model_flagged_needs_human",
      },
      update: {},
    });
  }

  await prisma.analyticsEvent.create({
    data: {
      conversationId: conversation.id,
      type: "chat_turn",
      latencyMs: Date.now() - startedAt,
      confidence: generated.confidence,
      escalated,
      metadata: { retrievedChunkCount: chunks.length },
    },
  });

  return {
    conversationId: conversation.id,
    answer: generated.answer,
    confidence: generated.confidence,
    escalated,
    citations: generated.citations,
  };
}
