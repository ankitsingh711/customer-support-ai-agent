import type {
  AnalyticsSummary,
  ChatMeta,
  Conversation,
  Escalation,
  UnansweredQuestion,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

async function adminFetch<T>(path: string, adminToken: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...init,
    headers: {
      ...init?.headers,
      Authorization: `Bearer ${adminToken}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`Request to ${path} failed: ${res.status}`);
  }
  return res.json();
}

export type StreamHandlers = {
  onMeta?: (meta: ChatMeta) => void;
  onDelta?: (text: string) => void;
  onDone?: () => void;
  onError?: (err: Event) => void;
};

/**
 * Opens an SSE connection to /api/chat/stream and wires up incremental
 * text deltas plus the final metadata (confidence, escalation, citations).
 */
export function streamChat(
  message: string,
  conversationId: string | undefined,
  handlers: StreamHandlers
): () => void {
  const params = new URLSearchParams({ message });
  if (conversationId) params.set("conversationId", conversationId);

  const source = new EventSource(apiUrl(`/api/chat/stream?${params.toString()}`));

  source.addEventListener("meta", (event) => {
    handlers.onMeta?.(JSON.parse((event as MessageEvent).data));
  });
  source.addEventListener("delta", (event) => {
    const { text } = JSON.parse((event as MessageEvent).data);
    handlers.onDelta?.(text);
  });
  source.addEventListener("done", () => {
    handlers.onDone?.();
    source.close();
  });
  source.onerror = (err) => {
    handlers.onError?.(err);
    source.close();
  };

  return () => source.close();
}

export const adminApi = {
  listConversations: (adminToken: string, status?: string) =>
    adminFetch<Conversation[]>(
      `/api/conversations${status ? `?status=${status}` : ""}`,
      adminToken
    ),
  listEscalations: (adminToken: string) =>
    adminFetch<Escalation[]>("/api/escalations", adminToken),
  resolveEscalation: (adminToken: string, id: string) =>
    adminFetch(`/api/escalations/${id}/resolve`, adminToken, { method: "POST" }),
  getAnalyticsSummary: (adminToken: string) =>
    adminFetch<AnalyticsSummary>("/api/analytics/summary", adminToken),
  getUnanswered: (adminToken: string) =>
    adminFetch<UnansweredQuestion[]>("/api/analytics/unanswered", adminToken),
  uploadDocument: (adminToken: string, sourcePath: string, content: string, title?: string) =>
    adminFetch("/api/kb", adminToken, {
      method: "POST",
      body: JSON.stringify({ sourcePath, content, title }),
    }),
};
