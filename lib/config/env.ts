/**
 * Environment access that fails as a configuration problem, not a crash.
 *
 * The clients in this codebase used to assert their variables with `!`, which
 * types away a value that genuinely may be absent. When it was, the failure
 * surfaced as an unrelated TypeError from deep inside a vendor library. A
 * `ConfigurationError` says what is actually wrong and names the variable, so
 * a route can answer 503 "not configured" instead of 500.
 *
 * `required` takes the value rather than the variable name so call sites keep
 * static `process.env.X` access — Next.js only inlines `NEXT_PUBLIC_*` into the
 * client bundle when it can see the property access literally.
 */

export class ConfigurationError extends Error {
  readonly variable: string;

  constructor(variable: string) {
    super(`Missing required environment variable: ${variable}`);
    this.name = "ConfigurationError";
    this.variable = variable;
  }
}

/** A blank or whitespace-only value counts as absent: hosts store unset as "". */
export function required(value: string | undefined, variable: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ConfigurationError(variable);
  }
  return value;
}

export function isConfigurationError(error: unknown): error is ConfigurationError {
  return error instanceof ConfigurationError;
}
