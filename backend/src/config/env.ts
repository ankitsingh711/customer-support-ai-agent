import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Support either a backend/.env (local override) or the repo-root .env (default
// per README setup). dotenv does not override already-set vars, so whichever is
// loaded first wins if both exist.
loadEnv({ path: path.resolve(__dirname, "../../.env") });
loadEnv({ path: path.resolve(__dirname, "../../../.env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
  CLAUDE_MODEL: z.string().default("claude-sonnet-5"),

  VOYAGE_API_KEY: z.string().min(1, "VOYAGE_API_KEY is required"),
  VOYAGE_MODEL: z.string().default("voyage-3-lite"),

  QDRANT_URL: z.string().default("http://localhost:6333"),
  QDRANT_API_KEY: z.string().optional(),
  QDRANT_COLLECTION: z.string().default("kb_chunks"),

  ADMIN_API_TOKEN: z.string().min(1, "ADMIN_API_TOKEN is required"),

  RETRIEVAL_TOP_K: z.coerce.number().default(5),
  CONFIDENCE_ESCALATION_THRESHOLD: z.coerce.number().min(0).max(1).default(0.55),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("Failed to load environment configuration. Check .env against .env.example.");
}

export const env = parsed.data;
