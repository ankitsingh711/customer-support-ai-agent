export type ChatRole = "CUSTOMER" | "ASSISTANT" | "AGENT" | "SYSTEM";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  citations?: string[] | null;
  confidence?: number | null;
  createdAt: string;
};

export type ChatMeta = {
  conversationId: string;
  confidence: number;
  escalated: boolean;
  citations: string[];
};

export type ConversationStatus = "ACTIVE" | "AUTO_RESOLVED" | "ESCALATED" | "CLOSED";

export type Conversation = {
  id: string;
  status: ConversationStatus;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  escalation: { id: string; reason: string; createdAt: string; resolvedAt: string | null } | null;
};

export type AnalyticsSummary = {
  totalConversations: number;
  autoResolved: number;
  escalated: number;
  resolutionRate: number;
  avgLatencyMs: number;
};

export type UnansweredQuestion = {
  conversationId: string | null;
  question: string | null;
  confidence: number | null;
  createdAt: string;
};

export type Escalation = {
  id: string;
  conversationId: string;
  reason: string;
  createdAt: string;
  resolvedAt: string | null;
  conversation: Conversation;
};
