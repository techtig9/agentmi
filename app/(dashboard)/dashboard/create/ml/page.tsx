"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { parseCsv } from "@/lib/ml/csv";
import { profileDataset } from "@/lib/ml/profile";
import { needsEncoding, encodeBinaryLabels } from "@/lib/ml/encode";
import { encodeMulticlassLabels, NotMulticlassError } from "@/lib/ml/encode-multiclass";
import { trainMlAgent } from "@/lib/actions/training";
import { NeonInput } from "@/components/ui/NeonInput";

export default function CreateMlAgentPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [agentName, setAgentName] = useState("My ML Agent");
  const [csvText, setCsvText] = useState("");
  const [targetColumn, setTargetColumn] = useState<string>("");
  const [task, setTask] = useState<"classification" | "regression">("classification");
  const [error, setError] = useState<string | null>(null);

  // Parsed entirely client-side — parseCsv/profileDataset are pure
  // functions with no server dependency, so this is instant, no round trip.
  const profile = useMemo(() => {
    if (csvText.trim().length === 0) return null;
    try {
      const rows = parseCsv(csvText);
      return { rows, profile: profileDataset(rows) };
    } catch {
      return null;
    }
  }, [csvText]);

  function handleTrain() {
    setError(null);
    if (!targetColumn) {
      setError("Choose a target column first.");
      return;
    }
    startTransition(async () => {
      const result = await trainMlAgent(agentName, csvText, targetColumn, task);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.agentId) router.push(`/dashboard/agents/${result.agentId}`);
    });
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold mb-1">Train an ML Agent</h1>
      <p className="text-ink-400 text-sm mb-6">
        Paste a CSV with a header row. Pick which column you want to predict.
      </p>

      <div className="flex flex-col gap-4">
        <NeonInput
          id="agent-name"
          label="Agent name"
          value={agentName}
          onChange={(e) => setAgentName(e.target.value)}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm text-ink-400">CSV data</label>
          <textarea
            rows={8}
            value={csvText}
            onChange={(e) => {
              setCsvText(e.target.value);
              setTargetColumn("");
            }}
            placeholder={"age,income,churned\n34,52000,0\n51,81000,1\n..."}
            className="w-full rounded-lg bg-base-900 border border-base-700 px-3.5 py-3 text-ink-100
                       font-mono text-sm placeholder:text-ink-600 outline-none transition-colors duration-200
                       focus:border-neon-cyan/60 focus:shadow-neon-cyan resize-none"
          />
        </div>

        {profile && (
          <div className="neon-card p-4 text-sm">
            <p className="text-ink-400 mb-3">
              {profile.profile.rowCount} rows detected · {profile.profile.columns.length} columns
            </p>
            <div className="flex flex-col gap-2">
              {profile.profile.columns.map((col) => (
                <label
                  key={col.name}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                    targetColumn === col.name
                      ? "border-neon-cyan/60 bg-neon-cyan/5"
                      : "border-base-700"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="targetColumn"
                      checked={targetColumn === col.name}
                      onChange={() => setTargetColumn(col.name)}
                    />
                    {col.name}
                  </span>
                  <span className="text-ink-600 text-xs uppercase">{col.type}</span>
                </label>
              ))}
            </div>
            {profile.profile.suggestedTargetColumn && !targetColumn && (
              <p className="text-xs text-ink-600 mt-2">
                Suggested target:{" "}
                <button
                  type="button"
                  className="text-neon-cyan hover:underline"
                  onClick={() => setTargetColumn(profile.profile.suggestedTargetColumn!)}
                >
                  {profile.profile.suggestedTargetColumn}
                </button>
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setTask("classification")}
            className={`neon-card px-4 py-2 text-sm flex-1 ${task === "classification" ? "border-neon-cyan/60 shadow-neon-cyan" : ""}`}
          >
            Classification
            <span className="block text-xs text-ink-600">Predict a 0/1 outcome</span>
          </button>
          <button
            type="button"
            onClick={() => setTask("regression")}
            className={`neon-card px-4 py-2 text-sm flex-1 ${task === "regression" ? "border-neon-cyan/60 shadow-neon-cyan" : ""}`}
          >
            Regression
            <span className="block text-xs text-ink-600">Predict a number</span>
          </button>
        </div>

        {task === "classification" && targetColumn && profile && (() => {
          const rawValues = profile.rows.map((r) => r[targetColumn]);
          const distinctCount = new Set(rawValues.map((v) => v.trim())).size;

          if (distinctCount <= 2) {
            if (!needsEncoding(rawValues)) return null; // already clean 0/1 — nothing to preview
            try {
              const { mapping, warnings } = encodeBinaryLabels(rawValues);
              const entries = Object.entries(mapping);
              return (
                <div className="text-xs text-ink-400 border border-base-700 rounded-lg p-3">
                  <p className="mb-1">
                    Auto-encoding: <span className="font-mono">{entries[0][0]}</span> →{" "}
                    {entries[0][1]}, <span className="font-mono">{entries[1][0]}</span> →{" "}
                    {entries[1][1]}
                  </p>
                  {warnings[0] && <p className="text-neon-violet">{warnings[0]}</p>}
                </div>
              );
            } catch {
              return null;
            }
          }

          // 3+ distinct values — multi-class path
          try {
            const { classNames } = encodeMulticlassLabels(rawValues);
            return (
              <div className="text-xs text-ink-400 border border-base-700 rounded-lg p-3">
                <p className="mb-1">
                  {classNames.length}-class classification detected:{" "}
                  <span className="font-mono">{classNames.join(", ")}</span>
                </p>
                <p className="text-ink-600">
                  Trained as one-vs-rest — one classifier per class, prediction picks the most
                  confident one.
                </p>
              </div>
            );
          } catch (e) {
            return (
              <p className="text-xs text-neon-pink">
                {e instanceof NotMulticlassError
                  ? e.message
                  : "This column can't be used for classification — switch to Regression, or pick a different column."}
              </p>
            );
          }
        })()}

        {error && (
          <p role="alert" className="text-neon-pink text-sm">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleTrain}
          disabled={isPending || !profile || !targetColumn}
          className="btn-primary"
        >
          {isPending ? "Training…" : "Train model"}
        </button>
      </div>
    </div>
  );
}
