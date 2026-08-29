"use client";
import { useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

export function AgentPlayground({ agentId }: { agentId: string }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sources, setSources] = useState<number>(0);
  const [model, setModel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function send() {
    const content = message.trim();
    if (!content || loading) return;
    setLoading(true); setError(null); setMessage("");
    const nextMessages = [...messages, { role: "user" as const, content }];
    setMessages(nextMessages);
    try {
      const res = await fetch(`/api/dashboard/agents/${agentId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, history: messages, ...(sessionId ? { session_id: sessionId } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed.");
      setMessages([...nextMessages, { role: "assistant", content: data.reply }]);
      setSources(data.sources_used ?? 0);
      if (data.session_id) setSessionId(data.session_id);
      setModel(data.model ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
      setMessages(messages);
    } finally { setLoading(false); }
  }

  return <div className="neon-card p-5 min-h-[560px] flex flex-col">
    <div className="flex-1 space-y-3 overflow-y-auto">
      {messages.length === 0 && !error && <div className="rounded-xl border border-base-700 p-4 text-sm text-ink-400">Send a message to this agent. Conversation history is retained for this test session and every execution is recorded in Runs.</div>}
      {messages.map((m, i) => <div key={i} className={`rounded-xl p-4 text-sm whitespace-pre-wrap ${m.role === "user" ? "bg-base-800 border border-base-700 ml-8" : "bg-base-700 mr-8"}`}><p className="text-[10px] uppercase font-mono text-ink-600 mb-1">{m.role}</p>{m.content}</div>)}
      {loading && <div className="rounded-xl bg-base-700 mr-8 p-4 text-sm text-ink-400">Agent is thinking…</div>}
      {error && <div className="rounded-xl border border-neon-pink/30 bg-neon-pink/5 p-4 text-sm text-neon-pink">{error}</div>}
      {messages.length > 0 && <p className="text-[11px] text-ink-600">Last response · {sources} knowledge sources{model ? ` · ${model}` : ""}</p>}
    </div>
    <div className="border-t border-base-700 pt-4 flex gap-2 mt-4">
      <input value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')send()}} placeholder="Type a test message..." disabled={loading} className="flex-1 bg-base-800 border border-base-700 rounded-lg px-3 py-2 text-sm" />
      <button onClick={send} disabled={loading || !message.trim()} className="btn-primary disabled:opacity-40">{loading ? "Running..." : "Send"}</button>
    </div>
  </div>;
}
