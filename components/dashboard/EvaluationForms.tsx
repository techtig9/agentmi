"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createEvaluation, runEvaluation, type CreateEvaluationState } from "@/lib/actions/evaluations";

const initialState: CreateEvaluationState = { error: null };

function CreateSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary text-sm">
      {pending ? "Creating…" : "Create evaluation"}
    </button>
  );
}

export function CreateEvaluationForm({ agents }: { agents: { id: string; name: string }[] }) {
  const [state, formAction] = useFormState(createEvaluation, initialState);
  return (
    <form action={formAction} className="neon-card p-5 flex flex-col gap-3">
      <p className="font-bold text-sm">New evaluation</p>
      <div className="grid md:grid-cols-2 gap-3">
        <label className="text-xs text-ink-500">
          Agent
          <select name="agentId" required disabled={agents.length === 0} className="mt-1 w-full rounded-lg bg-base-900 border border-base-700 p-2 text-sm">
            {agents.length === 0 && <option value="">No ready AI agents yet</option>}
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </label>
        <label className="text-xs text-ink-500">
          Evaluation name
          <input name="name" required minLength={2} maxLength={80} placeholder="Support tone regression" className="mt-1 w-full rounded-lg bg-base-900 border border-base-700 p-2 text-sm" />
        </label>
      </div>
      <label className="text-xs text-ink-500">
        Test cases — one per line: <code className="text-ink-400">input =&gt; expected substring in the reply</code>
        <textarea
          name="casesText"
          required
          rows={5}
          placeholder={"What's your refund policy? => 30 days\nDo you ship internationally? => yes"}
          className="mt-1 w-full rounded-lg bg-base-900 border border-base-700 p-2 text-sm font-mono"
        />
      </label>
      {state.error && <p className="text-neon-pink text-sm">{state.error}</p>}
      <div>
        <CreateSubmitButton />
      </div>
    </form>
  );
}

function RunSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-secondary text-xs px-3 py-1.5">
      {pending ? "Running…" : "Run"}
    </button>
  );
}

export function RunEvaluationButton({ evaluationId }: { evaluationId: string }) {
  return (
    <form action={runEvaluation}>
      <input type="hidden" name="evaluationId" value={evaluationId} />
      <RunSubmitButton />
    </form>
  );
}
