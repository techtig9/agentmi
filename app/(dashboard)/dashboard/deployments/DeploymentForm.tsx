"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createDeployment, type DeploymentState } from "@/lib/actions/deployments";

const initial: DeploymentState = { error: null, success: false };

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending || disabled} className="btn-primary disabled:opacity-50">
      {pending ? "Deploying…" : "Create deployment"}
    </button>
  );
}

export function DeploymentForm({ agents }: { agents: { id: string; name: string; status: string }[] }) {
  const [state, formAction] = useFormState(createDeployment, initial);
  return (
    <form action={formAction} className="neon-card p-5 grid md:grid-cols-4 gap-3 items-end">
      <label className="text-xs text-ink-500">Agent<select name="agentId" required className="mt-2 w-full rounded-lg bg-base-900 border border-base-700 p-2 text-sm">{agents.map(a=><option key={a.id} value={a.id} disabled={a.status !== "ready"}>{a.name} · {a.status}</option>)}</select></label>
      <label className="text-xs text-ink-500">Deployment name<input name="name" required minLength={2} maxLength={80} placeholder="Production v1" className="mt-2 w-full rounded-lg bg-base-900 border border-base-700 p-2 text-sm" /></label>
      <label className="text-xs text-ink-500">Environment<select name="environment" className="mt-2 w-full rounded-lg bg-base-900 border border-base-700 p-2 text-sm"><option value="staging">Staging</option><option value="production">Production</option></select></label>
      <SubmitButton disabled={agents.length===0} />
      {state.error && <p className="md:col-span-4 text-sm text-neon-pink">{state.error}</p>}
      {state.success && <p className="md:col-span-4 text-sm text-neon-green">Deployment created and activated.</p>}
    </form>
  );
}
