import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { HttpError } from "./errorHandler.js";

/**
 * Minimal bearer-token guard for admin-only routes (KB ingestion, escalations, analytics).
 * NOTE: this is a placeholder for real RBAC/SSO in production — see README roadmap.
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

  if (!token || token !== env.ADMIN_API_TOKEN) {
    return next(new HttpError(401, "Unauthorized"));
  }
  next();
}
