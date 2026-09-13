"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useFormState } from "react-dom";
import {
  Activity,
  BookOpen,
  Brain,
  Cpu,
  ExternalLink,
  FileText,
  Play,
  Rocket,
  Save,
  Settings2,
  Wrench,
} from "lucide-react";
import { updateAgent, type AgentActionState } from "@/lib/actions/agent-config";
import { Tabs, TabPanel, type TabItem } from "@/components/ui/Tabs";
import { TextField, TextAreaField } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormAlert } from "@/components/ui/FormAlert";
import { StatusBadge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";

const initialState: AgentActionState = { error: null };

export interface AgentBuilderData {
  id: string;
  name: string;
  kind: string;
  status: string;
  theme: string;
  description: string;
  systemPrompt: string;
  model: string;
  maxTokens: string;
  templateName: string | null;
  knowledgeSources: number;
  knowledgeChunks: number;
  toolCount: number;
  memoryCount: number;
}

const TABS: TabItem[] = [
  { id: "overview", label: "Overview", icon: Settings2 },
  { id: "instructions", label: "Instructions", icon: FileText },
  { id: "model", label: "Model", icon: Cpu },
  { id: "knowledge", label: "Knowledge", icon: BookOpen },
  { id: "memory", label: "Memory", icon: Brain },
  { id: "tools", label: "Tools", icon: Wrench },
  { id: "deploy", label: "Deploy", icon: Rocket },
];

/**
 * The agent builder.
 *
 * Replaces a static three-box graphic that was labelled "drag-and-drop
 * orchestration surface" but was neither drag-and-drop nor editable. Every
 * field here writes to the `config` keys the chat runtime actually reads, so a
 * change made in this screen changes how the agent behaves on the next run.
 */
export function AgentBuilder({ agent }: { agent: AgentBuilderData }) {
  const [state, formAction] = useFormState(updateAgent, initialState);
  const [tab, setTab] = useState("overview");
  const { toast } = useToast();

  useEffect(() => {
    if (state.success) toast(state.success, "success");
  }, [state.success, toast]);

  return (
    <form action={formAction}>
      <input type="hidden" name="agentId" value={agent.id} />

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0">
          <Tabs items={TABS} value={tab} onChange={setTab} label="Agent configuration" />

          <div className="mt-6">
            <TabPanel id="overview" active={tab === "overview"}>
              <div className="space-y-5">
                <TextField
                  name="name"
                  label="Agent name"
                  defaultValue={agent.name}
                  required
                  minLength={2}
                  maxLength={80}
                  hint="Shown across the workspace, in runs and in deployments."
                />
                <TextAreaField
                  name="description"
                  label="Description"
                  defaultValue={agent.description}
                  rows={4}
                  maxLength={2000}
                  hint="What this agent is for. Visible on the agent list and searchable."
                />
                <dl className="grid grid-cols-2 gap-4 rounded-xl border border-base-700 bg-base-900/60 p-4 text-sm">
                  <Detail label="Type" value={`${agent.kind.toUpperCase()} agent`} />
                  <Detail label="Template" value={agent.templateName ?? "None"} />
                  <Detail label="Theme" value={agent.theme.replace(/_/g, " ")} />
                  <Detail label="Status" value={agent.status} />
                </dl>
              </div>
            </TabPanel>

            <TabPanel id="instructions" active={tab === "instructions"}>
              <TextAreaField
                name="systemPrompt"
                label="System instructions"
                defaultValue={agent.systemPrompt}
                rows={16}
                maxLength={8000}
                placeholder="You are a support agent for {{company_name}}. Answer only from the knowledge base…"
                hint="Overrides the template's default prompt. Leave empty to use the template. {{company_name}} is substituted at run time."
                className="[&_textarea]:font-mono [&_textarea]:text-xs"
              />
              <p className="mt-4 rounded-lg border border-base-700 bg-base-900/60 p-3.5 text-xs text-ink-600">
                Retrieved knowledge is appended to your instructions inside a clearly delimited
                block, so the model can tell grounding material apart from instructions.
              </p>
            </TabPanel>

            <TabPanel id="model" active={tab === "model"}>
              <div className="space-y-5">
                <TextField
                  name="model"
                  label="Model override"
                  defaultValue={agent.model}
                  maxLength={120}
                  placeholder="Leave empty to use the workspace default"
                  hint="Provider routing picks a configured provider automatically. Set this only to pin a specific model id."
                  className="[&_input]:font-mono [&_input]:text-xs"
                />
                <TextField
                  name="maxTokens"
                  label="Max response tokens"
                  type="number"
                  min={128}
                  max={4096}
                  step={1}
                  defaultValue={agent.maxTokens}
                  placeholder="Default"
                  hint="Between 128 and 4096. Longer responses cost more credits."
                />
              </div>
            </TabPanel>

            <TabPanel id="knowledge" active={tab === "knowledge"}>
              <LinkPanel
                icon={BookOpen}
                title="Knowledge & RAG"
                stat={
                  agent.knowledgeSources === 0
                    ? "No sources attached yet"
                    : `${agent.knowledgeSources} source${agent.knowledgeSources === 1 ? "" : "s"} · ${agent.knowledgeChunks} indexed chunks`
                }
                description="Attach documents, pasted text and URLs. Content is chunked, indexed and retrieved on every run so answers come from your material."
                href={`/dashboard/agents/${agent.id}/knowledge`}
                cta="Manage knowledge"
              />
            </TabPanel>

            <TabPanel id="memory" active={tab === "memory"}>
              <LinkPanel
                icon={Brain}
                title="Persistent memory"
                stat={
                  agent.memoryCount === 0
                    ? "No memories stored yet"
                    : `${agent.memoryCount} stored ${agent.memoryCount === 1 ? "memory" : "memories"}`
                }
                description="Facts this agent has retained across conversations, scoped to your organization and reviewable one by one."
                href={`/dashboard/agents/${agent.id}/memory`}
                cta="Manage memory"
              />
            </TabPanel>

            <TabPanel id="tools" active={tab === "tools"}>
              <LinkPanel
                icon={Wrench}
                title="Tools"
                stat={`${agent.toolCount} ${agent.toolCount === 1 ? "tool" : "tools"} available to this agent`}
                description="HTTP tools this agent may call mid-run. Each call is recorded in the run trace with its outcome."
                href={`/dashboard/agents/${agent.id}/tools`}
                cta="Manage tools"
              />
            </TabPanel>

            <TabPanel id="deploy" active={tab === "deploy"}>
              <div className="space-y-4">
                <LinkPanel
                  icon={Rocket}
                  title="Deployments"
                  stat={
                    agent.status === "ready"
                      ? "This agent is ready to deploy"
                      : `Agent is ${agent.status} — only ready agents serve traffic`
                  }
                  description="Promote this agent to an environment and get a callable endpoint, with rollback and per-deployment run history."
                  href="/dashboard/deployments"
                  cta="Open deployments"
                />
                <LinkPanel
                  icon={Activity}
                  title="Observability"
                  stat="Every execution is recorded"
                  description="Inspect status, duration, trace and errors for this agent's runs."
                  href="/dashboard/runs"
                  cta="View runs"
                />
              </div>
            </TabPanel>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="neon-card p-5">
            <p className="font-mono text-xs uppercase tracking-wider text-ink-600">Agent</p>
            <p className="mt-2 truncate font-display font-bold">{agent.name}</p>
            <div className="mt-3">
              <StatusBadge status={agent.status} />
            </div>
          </div>

          <div className="neon-card p-5">
            <p className="font-mono text-xs uppercase tracking-wider text-ink-600">Configuration</p>
            <dl className="mt-3.5 space-y-2.5 text-sm">
              <SummaryRow label="Instructions" value={agent.systemPrompt ? "Custom" : "From template"} />
              <SummaryRow label="Model" value={agent.model || "Default"} mono />
              <SummaryRow label="Max tokens" value={agent.maxTokens || "Default"} mono />
              <SummaryRow label="Knowledge" value={`${agent.knowledgeSources} sources`} />
              <SummaryRow label="Tools" value={String(agent.toolCount)} />
            </dl>
          </div>

          {agent.kind === "ai" && agent.status === "ready" && (
            <Link href={`/dashboard/agents/${agent.id}/test`} className="btn-secondary w-full">
              <Play size={15} aria-hidden="true" />
              Open playground
            </Link>
          )}

          <div className="sticky bottom-4 space-y-3">
            {state.error && <FormAlert message={state.error} />}
            <SubmitButton className="w-full" icon={Save} pendingLabel="Saving…">
              Save changes
            </SubmitButton>
          </div>
        </aside>
      </div>
    </form>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-wider text-ink-600">{label}</dt>
      <dd className="mt-1 capitalize text-ink-100">{value}</dd>
    </div>
  );
}

function SummaryRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-ink-400">{label}</dt>
      <dd className={`min-w-0 truncate text-right ${mono ? "font-mono text-xs" : ""}`} title={value}>
        {value}
      </dd>
    </div>
  );
}

function LinkPanel({
  icon: Icon,
  title,
  stat,
  description,
  href,
  cta,
}: {
  icon: typeof BookOpen;
  title: string;
  stat: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="rounded-xl border border-base-700 bg-base-900/60 p-5">
      <div className="flex items-start gap-3.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-base-700 bg-base-900">
          <Icon size={17} className="text-neon-cyan" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-bold">{title}</h3>
          <p className="mt-1 font-mono text-xs text-neon-cyan">{stat}</p>
          <p className="mt-2.5 text-sm text-ink-400">{description}</p>
          <Link
            href={href}
            className="mt-4 inline-flex items-center gap-1.5 text-sm text-neon-cyan hover:underline"
          >
            {cta}
            <ExternalLink size={13} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
