"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/data/org-context";
import { parseCsv } from "@/lib/ml/csv";
import { profileDataset } from "@/lib/ml/profile";
import { encodeBinaryLabels } from "@/lib/ml/encode";
import { encodeMulticlassLabels } from "@/lib/ml/encode-multiclass";
import { creditCostFor } from "@/lib/pricing/costs";
import { dispatchWebhookEvent } from "@/lib/webhooks-outbound/dispatch";

export type TrainingState = {
  error: string | null;
  agentId?: string;
  labelMapping?: Record<string, 0 | 1> | null;
  classNames?: string[] | null;
  encodingWarning?: string | null;
};

interface TrainingServiceResponse {
  model: Record<string, unknown>; // shape varies: logistic_regression | linear_regression | multiclass_logistic_regression — see lib/ml/inference/predict.ts's StoredModel union for what each looks like
  metrics: Record<string, number>;
}

/**
 * task: 'classification' auto-encodes the target column: exactly 2
 * distinct values go through encodeBinaryLabels (yes/no, churned/
 * retained, etc. — see lib/ml/encode.ts); 3-20 distinct values go
 * through encodeMulticlassLabels and train one-vs-rest
 * (lib/ml/encode-multiclass.ts, training-service's
 * multiclass_logistic_regression.py).
 */
export async function trainMlAgent(
  agentName: string,
  csvText: string,
  targetColumn: string,
  task: "classification" | "regression"
): Promise<TrainingState> {
  const ctx = await getOrgContext();
  const supabase = createClient();

  const rows = parseCsv(csvText);
  if (rows.length < 10) {
    return { error: "Need at least 10 rows to train a meaningful model." };
  }

  const profile = profileDataset(rows);
  const targetCol = profile.columns.find((c) => c.name === targetColumn);
  if (!targetCol) {
    return { error: `Column "${targetColumn}" not found in the uploaded data.` };
  }

  const featureNames = profile.columns
    .filter((c) => c.name !== targetColumn && c.type === "numeric")
    .map((c) => c.name);

  if (featureNames.length === 0) {
    return { error: "No numeric feature columns found besides the target." };
  }

  const features = rows.map((row) => featureNames.map((name) => Number(row[name])));

  let targetValues: number[];
  let labelMapping: Record<string, 0 | 1> | null = null;
  let classNames: string[] | null = null;
  let encodingWarning: string | null = null;

  if (task === "classification") {
    const rawTargets = rows.map((r) => r[targetColumn]);
    const distinctCount = new Set(rawTargets.map((v) => v.trim())).size;

    try {
      if (distinctCount > 2) {
        const encoding = encodeMulticlassLabels(rawTargets);
        targetValues = encoding.encoded;
        classNames = encoding.classNames;
      } else {
        const encoding = encodeBinaryLabels(rawTargets);
        targetValues = encoding.encoded;
        labelMapping = encoding.mapping;
        encodingWarning = encoding.warnings[0] ?? null;
      }
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Couldn't encode the target column." };
    }
  } else {
    targetValues = rows.map((r) => Number(r[targetColumn]));
    if (targetValues.some((v) => Number.isNaN(v))) {
      return { error: `Column "${targetColumn}" contains non-numeric values — regression targets must be numbers.` };
    }
  }

  const { count: existingAgentCount } = await supabase
    .from("agents")
    .select("id", { count: "exact", head: true })
    .eq("org_id", ctx.orgId);
  const isFirstBuildForOrg = (existingAgentCount ?? 0) === 0;
  const cost = creditCostFor("create_ml_agent", { isFirstBuildForOrg });

  if (!ctx.isAdmin) {
    const { data: creditResultRaw, error: creditError } = await supabase
      .rpc("consume_credits", {
        p_org_id: ctx.orgId,
        p_amount: cost,
        p_reason: "create_ml_agent",
        p_actor_id: ctx.userId,
      })
      .single();
    const creditResult = creditResultRaw as unknown as { allowed: boolean; shortfall: number } | null;

    if (creditError || (creditResult && !creditResult.allowed)) {
      const shortfall = creditResult?.shortfall ?? 0;
      return {
        error: shortfall
          ? `Not enough credits — this build costs ${cost}, you're short ${shortfall}.`
          : "Couldn't check your credit balance. Please try again.",
      };
    }
  }

  const { data: agent, error: agentError } = await supabase
    .from("agents")
    .insert({
      org_id: ctx.orgId,
      kind: "ml",
      name: agentName,
      status: "training",
      theme: "cyber_neon",
      config: { target_column: targetColumn, task, feature_names: featureNames, label_mapping: labelMapping, class_names: classNames },
      created_by: ctx.userId,
    })
    .select("id")
    .single();

  if (agentError || !agent) {
    return { error: "Couldn't create the agent record." };
  }

  const { data: dataset, error: datasetError } = await supabase
    .from("datasets")
    .insert({
      org_id: ctx.orgId,
      agent_id: agent.id,
      file_url: "inline", // Phase 3 stores CSV inline via this action; S3 upload is a later optimization
      row_count: profile.rowCount,
      column_profile: profile as unknown as Record<string, unknown>,
      target_column: targetColumn,
    })
    .select("id")
    .single();

  if (datasetError || !dataset) {
    await supabase.from("agents").update({ status: "failed" }).eq("id", agent.id);
    return { error: "Couldn't store the dataset.", agentId: agent.id };
  }

  const { data: job } = await supabase
    .from("training_jobs")
    .insert({ org_id: ctx.orgId, agent_id: agent.id, dataset_id: dataset.id, task, status: "running", started_at: new Date().toISOString() })
    .select("id")
    .single();

  try {
    const response = await fetch(`${process.env.TRAINING_SERVICE_URL}/train`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task,
        features,
        feature_names: featureNames,
        ...(task === "classification" ? { labels: targetValues } : { targets: targetValues }),
      }),
    });

    if (!response.ok) {
      throw new Error(`training service returned ${response.status}`);
    }

    const result: TrainingServiceResponse = await response.json();
    const algorithm = String(result.model.type);

    await supabase.from("ml_models").insert({
      agent_id: agent.id,
      version: 1,
      algorithm,
      metrics: result.metrics,
      artifact_url: null, // model params are small enough to live in config below; artifact_url reserved for larger future model types
      status: "ready",
    });

    await supabase
      .from("agents")
      .update({
        status: "ready",
        config: {
          target_column: targetColumn,
          task,
          feature_names: featureNames,
          label_mapping: labelMapping,
          class_names: classNames,
          model: result.model,
        },
      })
      .eq("id", agent.id);

    if (job) {
      await supabase
        .from("training_jobs")
        .update({ status: "succeeded", completed_at: new Date().toISOString() })
        .eq("id", job.id);
    }

    await dispatchWebhookEvent(ctx.orgId, "agent.training_completed", agent.id, {
      metrics: result.metrics,
      algorithm,
    });

    return { error: null, agentId: agent.id, labelMapping, classNames, encodingWarning };
  } catch (e) {
    await supabase.from("agents").update({ status: "failed" }).eq("id", agent.id);
    if (job) {
      await supabase
        .from("training_jobs")
        .update({
          status: "failed",
          error_message: e instanceof Error ? e.message : "unknown error",
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);
    }
    await dispatchWebhookEvent(ctx.orgId, "agent.training_failed", agent.id, {
      error: e instanceof Error ? e.message : "unknown error",
    });
    return { error: "Training failed. Your credits were not refunded automatically — contact support if this persists.", agentId: agent.id };
  }
}
