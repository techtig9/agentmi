"use client";

import { useState } from "react";
import { useFormState } from "react-dom";
import {
  ArrowLeft,
  Bot,
  Database,
  Headphones,
  LineChart,
  Megaphone,
  Sparkles,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { createOrganization, type OnboardingState } from "@/lib/actions/organizations";
import { TextField } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormAlert } from "@/components/ui/FormAlert";
import { Button } from "@/components/ui/Button";

const initialState: OnboardingState = { error: null };

type StepId = "welcome" | "workspace" | "purpose" | "kind";
const STEPS: StepId[] = ["welcome", "workspace", "purpose", "kind"];

/** Focus areas. These steer where onboarding lands; they are not persisted as fake profile data. */
const PURPOSES: ReadonlyArray<readonly [string, string, LucideIcon]> = [
  ["support", "Customer support", Headphones],
  ["sales", "Sales & marketing", Megaphone],
  ["internal", "Internal tools", Wrench],
  ["research", "Research & analysis", LineChart],
  ["data", "Data & predictions", Database],
  ["other", "Something else", Sparkles],
];

/**
 * Multi-step first-run flow.
 *
 * Only the workspace name is submitted — it is the single field
 * `createOrganization` needs, and that action is unchanged. The purpose and
 * agent-kind answers decide the destination the action redirects to, so the
 * choices genuinely change what happens next instead of being collected and
 * discarded.
 */
export function OnboardingFlow() {
  const [state, formAction] = useFormState(createOrganization, initialState);
  const [step, setStep] = useState<StepId>("welcome");
  const [workspace, setWorkspace] = useState("");
  const [purpose, setPurpose] = useState<string | null>(null);
  const [kind, setKind] = useState<"ai" | "ml" | null>(null);

  const index = STEPS.indexOf(step);
  const destination = kind === "ml" ? "/dashboard/create/ml" : "/dashboard/create";

  function goNext(to: StepId) {
    setStep(to);
  }

  return (
    <div className="w-full max-w-lg">
      <div className="mb-6 flex items-center gap-1.5" role="presentation">
        {STEPS.map((id, i) => (
          <span
            key={id}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              i <= index ? "bg-neon-cyan" : "bg-base-700"
            }`}
          />
        ))}
      </div>
      <p className="mb-4 font-mono text-xs text-ink-600">
        Step {index + 1} of {STEPS.length}
      </p>

      <div className="neon-card p-6 sm:p-8">
        {step === "welcome" && (
          <section aria-labelledby="onboarding-heading">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-neon-cyan/30 bg-neon-cyan/10">
              <Sparkles size={20} className="text-neon-cyan" aria-hidden="true" />
            </span>
            <h1 id="onboarding-heading" className="mt-5 text-xl font-bold">
              Welcome to Agentmi
            </h1>
            <p className="mt-2 text-sm text-ink-400">
              You are four short steps from a working agent. We will set up your workspace, then
              take you straight into building your first one.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-ink-400">
              {[
                "Name your workspace",
                "Tell us what you are building",
                "Pick an AI agent or an ML agent",
                "Build it — 500 credits are already waiting",
              ].map((item, i) => (
                <li key={item} className="flex gap-2.5">
                  <span className="font-mono text-xs text-ink-600">{String(i + 1).padStart(2, "0")}</span>
                  {item}
                </li>
              ))}
            </ul>
            <Button className="mt-7 w-full" onClick={() => goNext("workspace")}>
              Get started
            </Button>
          </section>
        )}

        {step === "workspace" && (
          <section aria-labelledby="onboarding-heading">
            <h1 id="onboarding-heading" className="text-xl font-bold">
              Name your workspace
            </h1>
            <p className="mt-2 text-sm text-ink-400">
              This is where your agents, credits and team will live. You can rename it later in
              Settings.
            </p>
            <div className="mt-6">
              <TextField
                id="workspace-name"
                label="Organization name"
                placeholder="e.g. Acme Inc."
                value={workspace}
                onChange={(e) => setWorkspace(e.target.value)}
                required
                autoFocus
                maxLength={80}
                hint="At least 2 characters."
              />
            </div>
            <div className="mt-7 flex gap-2">
              <Button variant="secondary" icon={ArrowLeft} onClick={() => goNext("welcome")}>
                Back
              </Button>
              <Button
                className="flex-1"
                disabled={workspace.trim().length < 2}
                onClick={() => goNext("purpose")}
              >
                Continue
              </Button>
            </div>
          </section>
        )}

        {step === "purpose" && (
          <section aria-labelledby="onboarding-heading">
            <h1 id="onboarding-heading" className="text-xl font-bold">
              What are you building?
            </h1>
            <p className="mt-2 text-sm text-ink-400">
              This helps us point you at the right starting place. You are not locked in.
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {PURPOSES.map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPurpose(id)}
                  aria-pressed={purpose === id}
                  className={`flex items-center gap-3 rounded-xl border p-3.5 text-left text-sm transition-colors duration-200 ${
                    purpose === id
                      ? "border-neon-cyan/50 bg-neon-cyan/10 text-ink-100"
                      : "border-base-700 text-ink-400 hover:border-base-700 hover:bg-base-800 hover:text-ink-100"
                  }`}
                >
                  <Icon size={16} className="shrink-0" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-7 flex gap-2">
              <Button variant="secondary" icon={ArrowLeft} onClick={() => goNext("workspace")}>
                Back
              </Button>
              <Button className="flex-1" disabled={!purpose} onClick={() => goNext("kind")}>
                Continue
              </Button>
            </div>
          </section>
        )}

        {step === "kind" && (
          <section aria-labelledby="onboarding-heading">
            <h1 id="onboarding-heading" className="text-xl font-bold">
              AI agent or ML agent?
            </h1>
            <p className="mt-2 text-sm text-ink-400">
              Both live in the same workspace — this just decides which builder opens first.
            </p>

            <div className="mt-6 grid gap-3">
              <KindOption
                icon={Bot}
                title="AI Agent"
                description="Powered by a language model. Give it instructions, knowledge and tools — it converses and completes tasks."
                selected={kind === "ai"}
                onSelect={() => setKind("ai")}
              />
              <KindOption
                icon={Database}
                title="ML Agent"
                description="Trained on a dataset you upload. Makes predictions on structured data rather than holding a conversation."
                selected={kind === "ml"}
                onSelect={() => setKind("ml")}
              />
            </div>

            <form action={formAction} className="mt-7">
              <input type="hidden" name="name" value={workspace} />
              <input type="hidden" name="next" value={destination} />
              {state.error && (
                <div className="mb-4">
                  <FormAlert message={state.error} />
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="secondary" icon={ArrowLeft} onClick={() => goNext("purpose")}>
                  Back
                </Button>
                <SubmitButton className="flex-1" disabled={!kind} pendingLabel="Setting up…">
                  Create workspace
                </SubmitButton>
              </div>
            </form>
          </section>
        )}
      </div>

      <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-ink-600">
        <Users size={12} aria-hidden="true" />
        You can invite your team once your workspace exists.
      </p>
    </div>
  );
}

function KindOption({
  icon: Icon,
  title,
  description,
  selected,
  onSelect,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex gap-3.5 rounded-xl border p-4 text-left transition-colors duration-200 ${
        selected
          ? "border-neon-cyan/50 bg-neon-cyan/5"
          : "border-base-700 hover:border-base-700 hover:bg-base-800"
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
          selected ? "border-neon-cyan/40 bg-neon-cyan/10" : "border-base-700 bg-base-900"
        }`}
      >
        <Icon size={17} className={selected ? "text-neon-cyan" : "text-ink-400"} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block font-display font-bold text-ink-100">{title}</span>
        <span className="mt-1 block text-sm text-ink-400">{description}</span>
      </span>
    </button>
  );
}
