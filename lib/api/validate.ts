import { NextResponse } from "next/server";
import { z } from "zod";

/**
 * One shape for every validation failure across the public API.
 *
 * Routes previously hand-rolled their checks, which worked but meant a client
 * had to handle a different error body per endpoint. `details` names the
 * offending field so a caller can fix the request without guessing, and the
 * message never echoes the submitted value back — that is how a reflected
 * payload ends up in someone's logs or terminal.
 */
export interface ValidationFailure {
  error: string;
  code: "invalid_request";
  details: Array<{ field: string; message: string }>;
}

export function validationFailure(issues: z.ZodIssue[]): ValidationFailure {
  return {
    error: "Request validation failed.",
    code: "invalid_request",
    details: issues.map((issue) => ({
      field: issue.path.join(".") || "(body)",
      message: issue.message,
    })),
  };
}

export type ParsedBody<T> = { ok: true; data: T } | { ok: false; response: NextResponse };

/**
 * Parses and validates a JSON request body.
 *
 * Malformed JSON and a schema violation are different failures and get
 * different bodies, because they need different fixes by the caller.
 */
export async function parseJsonBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T
): Promise<ParsedBody<z.infer<T>>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Request body must be valid JSON.", code: "invalid_json" },
        { status: 400 }
      ),
    };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    return { ok: false, response: NextResponse.json(validationFailure(result.error.issues), { status: 400 }) };
  }
  return { ok: true, data: result.data };
}

/** Message length matches the existing runtime limit; kept in one place now. */
export const MAX_MESSAGE_CHARS = 4000;

export const chatMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "message must not be empty")
    .max(MAX_MESSAGE_CHARS, `message must be at most ${MAX_MESSAGE_CHARS} characters`),
  conversationId: z.string().uuid("conversationId must be a UUID").optional(),
});
