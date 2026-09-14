import { AlertCircle, CheckCircle2 } from "lucide-react";

/**
 * Inline form feedback.
 *
 * role="alert" so the message is announced the moment a server action returns,
 * rather than silently appearing below a form the user has already tabbed past.
 */
export function FormAlert({ message, tone = "error" }: { message: string; tone?: "error" | "success" }) {
  const isError = tone === "error";
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <p
      role="alert"
      className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${
        isError
          ? "border-neon-pink/30 bg-neon-pink/5 text-neon-pink"
          : "border-neon-green/30 bg-neon-green/5 text-neon-green"
      }`}
    >
      <Icon size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0">{message}</span>
    </p>
  );
}
