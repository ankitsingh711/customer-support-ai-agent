"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import type { AnalyticsSummary, Conversation, Escalation, UnansweredQuestion } from "@/lib/types";
import StatCard from "./StatCard";

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
    const form = new FormData(e.currentTarget);
    const sourcePath = String(form.get("sourcePath") ?? "");
    const content = String(form.get("content") ?? "");
    if (!sourcePath || !content) return;

    setUploadState("saving");
    try {
      await adminApi.uploadDocument(token, sourcePath, content);
      setUploadState("saved");
      e.currentTarget.reset();
    } catch {
      setUploadState("error");
    }
  }

  if (!token) {
    return (
      <div className="mx-auto mt-24 max-w-sm rounded-xl border border-black/10 p-6 dark:border-white/10">
        <h1 className="text-lg font-semibold">Admin access</h1>
        <p className="mt-1 text-sm text-neutral-500">Enter the ADMIN_API_TOKEN from your backend .env.</p>
        <input
          className="mt-4 w-full rounded border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/10"
          type="password"
          placeholder="Admin token"
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
        />
        <button
          onClick={saveToken}
          className="mt-3 w-full rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white"
        >
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10">
      <h1 className="text-2xl font-semibold">Support Operations Dashboard</h1>
      {error && <p className="rounded bg-red-100 px-3 py-2 text-sm text-red-800">{error}</p>}

      {summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Conversations" value={String(summary.totalConversations)} />
          <StatCard
            label="Resolution rate"
            value={`${Math.round(summary.resolutionRate * 100)}%`}
            hint={`${summary.autoResolved} auto-resolved`}
          />
          <StatCard label="Escalated" value={String(summary.escalated)} />
          <StatCard label="Avg latency" value={`${summary.avgLatencyMs} ms`} />
        </div>
      )}

      <section>
        <h2 className="mb-3 text-lg font-medium">Escalation queue</h2>
        {escalations.length === 0 && <p className="text-sm text-neutral-500">Nothing escalated right now.</p>}
        <ul className="space-y-2">
          {escalations.map((esc) => (
            <li
              key={esc.id}
              className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900/40 dark:bg-amber-900/10"
            >
              <div>
                <p className="font-medium">{esc.reason.replace(/_/g, " ")}</p>
                <p className="text-neutral-500">
                  {esc.conversation.messages[0]?.content?.slice(0, 100) ?? "(no message)"}
                </p>
              </div>
              <button
                onClick={() => resolveEscalation(esc.id)}
                className="rounded bg-amber-600 px-3 py-1 text-xs font-medium text-white"
              >
                Mark resolved
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">Recent conversations</h2>
        <div className="overflow-hidden rounded-lg border border-black/10 dark:border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-neutral-100 text-left dark:bg-neutral-800">
              <tr>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">First message</th>
                <th className="px-3 py-2">Updated</th>
              </tr>
            </thead>
            <tbody>
              {conversations.map((c) => (
                <tr key={c.id} className="border-t border-black/5 dark:border-white/5">
                  <td className="px-3 py-2">
                    <span
                      className={
                        c.status === "ESCALATED"
                          ? "rounded bg-amber-100 px-2 py-0.5 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                          : c.status === "AUTO_RESOLVED"
                            ? "rounded bg-green-100 px-2 py-0.5 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                            : "rounded bg-neutral-200 px-2 py-0.5 dark:bg-neutral-700"
                      }
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-neutral-600 dark:text-neutral-300">
                    {c.messages[0]?.content?.slice(0, 80) ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-neutral-500">{new Date(c.updatedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">Unanswered / low-confidence questions</h2>
        <ul className="space-y-1 text-sm">
          {unanswered.map((u, i) => (
            <li key={i} className="text-neutral-600 dark:text-neutral-300">
              {u.question ?? "—"}{" "}
              <span className="text-neutral-400">
                (confidence {u.confidence !== null ? u.confidence.toFixed(2) : "n/a"})
              </span>
            </li>
          ))}
          {unanswered.length === 0 && <p className="text-neutral-500">No low-confidence answers yet.</p>}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">Add knowledge base document</h2>
        <form onSubmit={handleUpload} className="space-y-3 rounded-lg border border-black/10 p-4 dark:border-white/10">
          <input
            name="sourcePath"
            placeholder="Source id, e.g. shipping-policy.md"
            className="w-full rounded border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/10"
            required
          />
          <textarea
            name="content"
            placeholder="Markdown content (use # headings to help chunking)"
            rows={6}
            className="w-full rounded border border-black/10 bg-transparent px-3 py-2 text-sm dark:border-white/10"
            required
          />
          <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white">
            {uploadState === "saving" ? "Saving…" : "Embed & upload"}
          </button>
          {uploadState === "saved" && <p className="text-sm text-green-600">Document embedded and indexed.</p>}
          {uploadState === "error" && <p className="text-sm text-red-600">Upload failed.</p>}
        </form>
      </section>
    </div>
  );
}
