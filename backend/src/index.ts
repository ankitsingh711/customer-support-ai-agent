import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { rateLimiter } from "./middleware/rateLimiter.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { chatRouter } from "./routes/chat.js";
import { conversationsRouter } from "./routes/conversations.js";
import { escalationsRouter } from "./routes/escalations.js";
import { kbRouter } from "./routes/kb.js";
import { analyticsRouter } from "./routes/analytics.js";

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: "1mb" }));
app.use(requestLogger);
app.use(rateLimiter);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/chat", chatRouter);
app.use("/api/conversations", conversationsRouter);
app.use("/api/escalations", escalationsRouter);
app.use("/api/kb", kbRouter);
app.use("/api/analytics", analyticsRouter);

app.use(errorHandler);

app.listen(env.PORT, () => {
  logger.info(`Support agent backend listening on port ${env.PORT}`);
});
