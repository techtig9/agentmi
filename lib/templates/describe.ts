/**
 * Derives what a template actually needs, from its real config.
 *
 * Nothing here is authored per-template: the requirements come from the same
 * `config` the runtime reads, so a template can never advertise a capability
 * its configuration does not carry.
 */
export interface TemplateConfig {
  system_prompt_template?: unknown;
  tools?: unknown;
  escalation_enabled?: unknown;
}

export interface TemplateRequirement {
  label: string;
  detail: string;
}

export function templateRequirements(rawConfig: unknown): TemplateRequirement[] {
  const config = (rawConfig ?? {}) as TemplateConfig;
  const requirements: TemplateRequirement[] = [];

  const tools = Array.isArray(config.tools) ? config.tools.filter((t) => typeof t === "string") : [];

  // A template whose prompt tells the model to answer "using only the provided
  // knowledge base" is useless without knowledge attached — that is a real
  // setup requirement, not a suggestion.
  const prompt = typeof config.system_prompt_template === "string" ? config.system_prompt_template : "";
  if (tools.includes("knowledge_base_search") || /knowledge base/i.test(prompt)) {
    requirements.push({
      label: "Knowledge required",
      detail: "Attach documents or a URL after creating, or the agent has nothing to answer from.",
    });
  }

  if (config.escalation_enabled === true) {
    requirements.push({
      label: "Escalation enabled",
      detail: "The agent offers a human handover when it cannot answer.",
    });
  }

  const otherTools = tools.filter((tool) => tool !== "knowledge_base_search");
  if (otherTools.length > 0) {
    requirements.push({
      label: "Tools expected",
      detail: `Configure ${otherTools.join(", ")} under the agent's Tools tab.`,
    });
  }

  if (requirements.length === 0) {
    requirements.push({
      label: "No setup required",
      detail: "Works as soon as it is created. Add knowledge and tools later if you want.",
    });
  }

  return requirements;
}

/** The prompt the agent will start from, for preview. */
export function templatePrompt(rawConfig: unknown): string | null {
  const config = (rawConfig ?? {}) as TemplateConfig;
  return typeof config.system_prompt_template === "string" ? config.system_prompt_template : null;
}

/** `customer_support` → `Customer Support`. Categories are free text in the schema. */
export function categoryLabel(category: string): string {
  return category
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
