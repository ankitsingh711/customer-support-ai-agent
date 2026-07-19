"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import type { AnalyticsSummary, Conversation, Escalation, UnansweredQuestion } from "@/lib/types";
import StatCard from "./StatCard";

function StatusBadge({ status }: { status: Conversation["status"] }) {
  const styles: Record<Conversation["status"], string> = {
    ESCALATED: "bg-amber-50 text-amber-700 border-amber-200",
    AUTO_RESOLVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    ACTIVE: "bg-blue-50 text-blue-700 border-blue-200",
    CLOSED: "bg-neutral-100 text-neutral-600 border-neutral-200",
  };
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default function AdminDashboard() {
  const [token, setToken] = useState(() =>
    typeof window === "undefined" ? "" : (window.localStorage.getItem("admin_token") ?? "")
  );
  const [tokenInput, setTokenInput] = useState(token);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unanswered, setUnanswered] = useState<UnansweredQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function load() {
      try {
        const [s, e, c, u] = await Promise.all([
          adminApi.getAnalyticsSummary(token),
          adminApi.listEscalations(token),
          adminApi.listConversations(token),
          adminApi.getUnanswered(token),
        ]);
        if (cancelled) return;
        setSummary(s);
        setEscalations(e);
        setConversations(c);
        setUnanswered(u);
        setError(null);
      } catch {
        if (!cancelled) setError("Failed to load admin data — check your token and that the backend is running.");
      }
    }

    load();
    const interval = setInterval(load, 10_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [token]);

  function saveToken() {
    window.localStorage.setItem("admin_token", tokenInput);
    setToken(tokenInput);
  }

  async function resolveEscalation(id: string) {
    await adminApi.resolveEscalation(token, id);
    setEscalations((prev) => prev.filter((e) => e.id !== id));
  }

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    const form = new FormData(formEl);
    const sourcePath = String(form.get("sourcePath") ?? "");
    const content = String(form.get("content") ?? "");
    if (!sourcePath || !content) return;

    setUploadState("saving");
    try {
      await adminApi.uploadDocument(token, sourcePath, content);
      setUploadState("saved");
      formEl.reset();
    } catch {
      setUploadState("error");
    }
  }

  if (!token) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </span>
          <h1 className="text-lg font-semibold">Admin access</h1>
          <p className="mt-1 text-sm text-muted">Enter the ADMIN_API_TOKEN from your backend .env.</p>
          <input
            className="mt-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:bg-white"
            type="password"
            placeholder="Admin token"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveToken()}
          />
          <button
            onClick={saveToken}
            className="mt-3 w-full rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Support Operations Dashboard</h1>
          <p className="text-sm text-muted">Live view of conversations, escalations, and knowledge base health.</p>
        </div>
        <button
          onClick={() => {
            window.localStorage.removeItem("admin_token");
            setToken("");
          }}
          className="text-xs font-medium text-muted hover:text-accent"
        >
          Sign out
        </button>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Conversations" value={String(summary.totalConversations)} />
          <StatCard
            label="Resolution rate"
            value={`${Math.round(summary.resolutionRate * 100)}%`}
            hint={`${summary.autoResolved} auto-resolved`}
            tone="good"
          />
          <StatCard label="Escalated" value={String(summary.escalated)} tone={summary.escalated > 0 ? "warn" : "default"} />
          <StatCard label="Avg latency" value={`${summary.avgLatencyMs} ms`} />
        </div>
      )}

      <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold">Escalation queue</h2>
        {escalations.length === 0 ? (
          <p className="rounded-lg bg-background px-4 py-6 text-center text-sm text-muted">
            Nothing escalated right now — all clear.
          </p>
        ) : (
          <ul className="space-y-2">
            {escalations.map((esc) => (
              <li
                key={esc.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium capitalize text-amber-900">{esc.reason.replace(/_/g, " ")}</p>
                  <p className="truncate text-amber-700/80">
                    {esc.conversation.messages[0]?.content?.slice(0, 100) ?? "(no message)"}
                  </p>
                </div>
                <button
                  onClick={() => resolveEscalation(esc.id)}
                  className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-700"
                >
                  Mark resolved
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold">Recent conversations</h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-background text-left text-xs font-medium uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">First message</th>
                <th className="px-4 py-2.5">Updated</th>
              </tr>
            </thead>
            <tbody>
              {conversations.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-muted">
                    No conversations yet.
                  </td>
                </tr>
              )}
              {conversations.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-4 py-2.5">
                    <StatusBadge status={c.status} />
                  </td>
                  <td className="max-w-xs truncate px-4 py-2.5 text-foreground/80">
                    {c.messages[0]?.content?.slice(0, 80) ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-muted">
                    {new Date(c.updatedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold">Unanswered / low-confidence questions</h2>
        {unanswered.length === 0 ? (
          <p className="rounded-lg bg-background px-4 py-6 text-center text-sm text-muted">
            No low-confidence answers yet.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {unanswered.map((u, i) => (
              <li key={i} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                <span className="truncate text-foreground/80">{u.question ?? "—"}</span>
                <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-xs text-muted">
                  confidence {u.confidence !== null ? u.confidence.toFixed(2) : "n/a"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold">Add knowledge base document</h2>
        <form onSubmit={handleUpload} className="space-y-3">
          <input
            name="sourcePath"
            placeholder="Source id, e.g. shipping-policy.md"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:bg-white"
            required
          />
          <textarea
            name="content"
            placeholder="Markdown content (use # headings to help chunking)"
            rows={6}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent focus:bg-white"
            required
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={uploadState === "saving"}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              {uploadState === "saving" ? "Saving…" : "Embed & upload"}
            </button>
            {uploadState === "saved" && <p className="text-sm text-emerald-600">Document embedded and indexed.</p>}
            {uploadState === "error" && <p className="text-sm text-red-600">Upload failed.</p>}
          </div>
        </form>
      </section>
    </div>
  );
}
