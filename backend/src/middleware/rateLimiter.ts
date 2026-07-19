import type { NextFunction, Request, Response } from "express";
import { HttpError } from "./errorHandler.js";

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;

const hits = new Map<string, { count: number; resetAt: number }>();

/**
 * In-memory sliding-window limiter, fine for a single-instance demo.
 * Swap for a Redis-backed limiter before running multiple backend replicas.
 */
export function rateLimiter(req: Request, _res: Response, next: NextFunction) {
  const key = req.ip ?? "unknown";
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || entry.resetAt < now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return next(new HttpError(429, "Too many requests, please slow down."));
  }

  entry.count += 1;
  next();
}
