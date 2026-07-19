"use client";

import { useRef, useState } from "react";
import { streamChat } from "@/lib/api";
import type { ChatMeta } from "@/lib/types";

type DisplayMessage = {
  id: string;
  role: "customer" | "assistant";
  content: string;
  citations?: string[];
  escalated?: boolean;
};

export default function ChatWidget() {
  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm the support assistant. Ask me about orders, password resets, refunds, or your subscription.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const conversationIdRef = useRef<string | undefined>(undefined);

  function send() {
    const question = input.trim();
    if (!question || isStreaming) return;

    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "customer", content: question },
    ]);

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);
    setIsStreaming(true);

    let meta: ChatMeta | undefined;

    streamChat(question, conversationIdRef.current, {
      onMeta: (m) => {
        meta = m;
        conversationIdRef.current = m.conversationId;
      },
      onDelta: (text) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + text } : m))
        );
      },
      onDone: () => {
        setIsStreaming(false);
        if (meta) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, citations: meta!.citations, escalated: meta!.escalated }
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
              ? { ...m, content: "Sorry, something went wrong reaching support." }
              : m
          )
        );
      },
    });
  }

  return (
    <div className="mx-auto flex h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-lg dark:border-white/10 dark:bg-neutral-900">
      <header className="border-b border-black/10 px-5 py-4 dark:border-white/10">
        <h1 className="text-lg font-semibold">Support Assistant</h1>
        <p className="text-sm text-neutral-500">Powered by RAG over your knowledge base</p>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {messages.map((m) => (
          <div key={m.id} className={m.role === "customer" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "customer"
                  ? "max-w-[80%] rounded-2xl rounded-br-sm bg-blue-600 px-4 py-2 text-white"
                  : "max-w-[80%] rounded-2xl rounded-bl-sm bg-neutral-100 px-4 py-2 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
              }
            >
              <p className="whitespace-pre-wrap text-sm">{m.content || "…"}</p>
              {m.escalated && (
                <p className="mt-2 rounded bg-amber-100 px-2 py-1 text-xs text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  This conversation was escalated to a human agent.
                </p>
              )}
              {m.citations && m.citations.length > 0 && (
                <p className="mt-2 text-xs text-neutral-500">
                  Sources: {m.citations.join(", ")}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 border-t border-black/10 p-4 dark:border-white/10">
        <input
          className="flex-1 rounded-full border border-black/10 bg-transparent px-4 py-2 text-sm outline-none focus:border-blue-500 dark:border-white/10"
          placeholder="Ask a question…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          disabled={isStreaming}
        />
        <button
          onClick={send}
          disabled={isStreaming || !input.trim()}
          className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}
