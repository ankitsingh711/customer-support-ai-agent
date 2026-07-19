"use client";

import { useEffect, useRef, useState } from "react";
import { streamChat } from "@/lib/api";
import type { ChatMeta } from "@/lib/types";

type DisplayMessage = {
  id: string;
  role: "customer" | "assistant";
  content: string;
  citations?: string[];
  escalated?: boolean;
  pending?: boolean;
};

const SUGGESTIONS = [
  "Where's my order?",
  "How do I reset my password?",
  "What's your refund policy?",
  "Can I change my subscription?",
];

export default function ChatWidget() {
  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm the support assistant. Ask me about orders, password resets, refunds, or your subscription — I'll answer from our knowledge base or connect you with a human if I'm not sure.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const conversationIdRef = useRef<string | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function send(question?: string) {
    const text = (question ?? input).trim();
    if (!text || isStreaming) return;

    setInput("");
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "customer", content: text }]);

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", pending: true }]);
    setIsStreaming(true);

    let meta: ChatMeta | undefined;

    streamChat(text, conversationIdRef.current, {
      onMeta: (m) => {
        meta = m;
        conversationIdRef.current = m.conversationId;
      },
      onDelta: (delta) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: m.content + delta, pending: false } : m
          )
        );
      },
      onDone: () => {
        setIsStreaming(false);
        if (meta) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, citations: meta!.citations, escalated: meta!.escalated, pending: false }
                : m
            )
          );
        }
      },
      onError: () => {
        setIsStreaming(false);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId && m.content === ""
              ? { ...m, content: "Sorry, something went wrong reaching support. Please try again.", pending: false }
              : m
          )
        );
      },
    });
  }

  const showSuggestions = messages.length === 1;

  return (
    <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <header className="flex items-center gap-3 border-b border-border px-5 py-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-accent">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        </span>
        <div className="flex-1">
          <h1 className="text-base font-semibold">Support Assistant</h1>
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Online — answers from your knowledge base
          </p>
        </div>
      </header>

      <div ref={scrollRef} className="h-[60vh] flex-1 space-y-4 overflow-y-auto px-5 py-5 sm:h-[65vh]">
        {messages.map((m) => (
          <div key={m.id} className={m.role === "customer" ? "flex justify-end" : "flex items-start gap-2.5"}>
            {m.role === "assistant" && (
              <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
                AI
              </span>
            )}
            <div
              className={
                m.role === "customer"
                  ? "max-w-[80%] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-white"
                  : "max-w-[80%] rounded-2xl rounded-bl-md border border-border bg-white px-4 py-2.5 text-foreground"
              }
            >
              {m.pending ? (
                <span className="flex gap-1 py-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" />
                </span>
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</p>
              )}

              {m.escalated && (
                <p className="mt-2 flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 9v4M12 17h.01M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L14.7 3.86a2 2 0 0 0-3.4 0Z" />
                  </svg>
                  Escalated to a human agent — someone will follow up shortly.
                </p>
              )}
              {m.citations && m.citations.length > 0 && (
                <p className="mt-2 text-xs text-muted">Sources: {m.citations.join(", ")}</p>
              )}
            </div>
          </div>
        ))}

        {showSuggestions && (
          <div className="flex flex-wrap gap-2 pl-9">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-accent"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-border bg-white px-4 py-3">
        <input
          className="flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent focus:bg-white"
          placeholder="Ask a question…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          disabled={isStreaming}
        />
        <button
          onClick={() => send()}
          disabled={isStreaming || !input.trim()}
          aria-label="Send message"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="m22 2-7 20-4-9-9-4Z" />
            <path d="M22 2 11 13" />
          </svg>
        </button>
      </div>
    </div>
  );
}
