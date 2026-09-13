"use client";

import { useReducer } from "react";
import { wizardReducer, seedWizardState } from "@/lib/agent-builder/wizard-state";
import { creditCostFor } from "@/lib/pricing/costs";
import { DescribeStep } from "./DescribeStep";
import { ConfirmTypeStep } from "./ConfirmTypeStep";
import { TemplateStep, type TemplateOption } from "./TemplateStep";
import { ThemeStep } from "./ThemeStep";
import { DataSourceStep } from "./DataSourceStep";
import { ReviewStep } from "./ReviewStep";

interface Props {
  templates: TemplateOption[];
  isFirstBuildForOrg: boolean;
  isAdmin: boolean;
  /**
   * Template preselected via `?template=` (from the Templates page). Already
   * validated against `templates` server-side, so it is safe to seed with.
   */
  initialTemplateId?: string | null;
}

export function PromptEngineerWizard({
  templates,
  isFirstBuildForOrg,
  isAdmin,
  initialTemplateId = null,
}: Props) {
  const [state, dispatch] = useReducer(
    wizardReducer,
    initialTemplateId,
    seedWizardState
  );
  const next = () => dispatch({ type: "NEXT" });
  const back = () => dispatch({ type: "BACK" });

  const buildCost = creditCostFor("create_ai_agent", { isFirstBuildForOrg });

  switch (state.step) {
    case "describe":
      return <DescribeStep state={state} dispatch={dispatch} onNext={next} />;
    case "confirm_type":
      return <ConfirmTypeStep state={state} dispatch={dispatch} onNext={next} onBack={back} />;
    case "template":
      return (
        <TemplateStep
          state={state}
          dispatch={dispatch}
          onNext={next}
          onBack={back}
          templates={templates}
        />
      );
    case "theme":
      return <ThemeStep state={state} dispatch={dispatch} onNext={next} onBack={back} />;
    case "data_source":
      return <DataSourceStep state={state} dispatch={dispatch} onNext={next} onBack={back} />;
    case "review":
      return (
        <ReviewStep
          state={state}
          onBack={back}
          templates={templates}
          buildCost={buildCost}
          isAdmin={isAdmin}
        />
      );
  }
}
