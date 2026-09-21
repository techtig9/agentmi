/**
 * Transactional email content, separated from delivery.
 *
 * Templates are pure functions returning subject and body, so they can be
 * unit-tested without a provider, a key or a network call — and so changing
 * provider later touches only `send.ts`.
 *
 * Every template renders plain text alongside HTML. A text part is not
 * optional: without one, spam filters score the message worse and any client
 * that cannot render HTML shows an empty message.
 */

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

function layout(heading: string, paragraphs: string[], action?: { label: string; url: string }): string {
  const body = paragraphs.map((p) => `<p style="margin:0 0 16px;line-height:1.6">${escapeHtml(p)}</p>`).join("");
  const button = action
    ? `<p style="margin:24px 0"><a href="${escapeHtml(action.url)}" style="background:#0f766e;color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">${escapeHtml(action.label)}</a></p>`
    : "";
  return `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#0a1416">
<h1 style="font-size:20px;margin:0 0 20px">${escapeHtml(heading)}</h1>
${body}${button}
<p style="margin:32px 0 0;font-size:12px;color:#5c6b68">Agentmi</p>
</div>`;
}

/** Interpolated values are caller-supplied, so they are escaped, not trusted. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function plain(heading: string, paragraphs: string[], action?: { label: string; url: string }): string {
  const lines = [heading, "", ...paragraphs];
  if (action) lines.push("", `${action.label}: ${action.url}`);
  lines.push("", "Agentmi");
  return lines.join("\n");
}

export function welcomeEmail(input: { name?: string; appUrl: string }): EmailContent {
  const heading = input.name ? `Welcome, ${input.name}` : "Welcome to Agentmi";
  const paragraphs = [
    "Your workspace is ready. The fastest way to see what this does is to describe what you need in plain language and let Agentmi pick a starting template.",
    "Your plan includes a monthly credit allowance, and building your first agent is discounted so you get a working result before the full cost applies.",
  ];
  const action = { label: "Build your first agent", url: `${input.appUrl}/dashboard/create` };
  return { subject: "Welcome to Agentmi", text: plain(heading, paragraphs, action), html: layout(heading, paragraphs, action) };
}

export function verifyEmail(input: { verifyUrl: string }): EmailContent {
  const heading = "Confirm your email address";
  const paragraphs = [
    "Confirm this address to finish setting up your Agentmi account.",
    "If you did not create an account, you can ignore this message and nothing will happen.",
  ];
  const action = { label: "Confirm email", url: input.verifyUrl };
  return { subject: "Confirm your Agentmi email", text: plain(heading, paragraphs, action), html: layout(heading, paragraphs, action) };
}

export function receiptEmail(input: { planName: string; amount: string; periodEnd: string; appUrl: string }): EmailContent {
  const heading = `Receipt for ${input.planName}`;
  const paragraphs = [
    `We have received ${input.amount} for your ${input.planName} plan.`,
    `Your current period runs until ${input.periodEnd}.`,
    "Paddle is the merchant of record and holds the tax invoice.",
  ];
  const action = { label: "View billing", url: `${input.appUrl}/dashboard/billing` };
  return { subject: `Your Agentmi receipt — ${input.planName}`, text: plain(heading, paragraphs, action), html: layout(heading, paragraphs, action) };
}

export function trialEndingEmail(input: { daysLeft: number; appUrl: string }): EmailContent {
  const heading = input.daysLeft === 1 ? "Your trial ends tomorrow" : `Your trial ends in ${input.daysLeft} days`;
  const paragraphs = [
    "Your agents, knowledge and deployments stay exactly as they are. What changes is the credit allowance available to run them.",
    "Choosing a plan now avoids any interruption.",
  ];
  const action = { label: "Choose a plan", url: `${input.appUrl}/dashboard/billing` };
  return { subject: heading, text: plain(heading, paragraphs, action), html: layout(heading, paragraphs, action) };
}

export function paymentFailedEmail(input: { appUrl: string }): EmailContent {
  const heading = "We could not take your payment";
  const paragraphs = [
    "The most recent charge for your Agentmi subscription was declined. This is usually an expired card.",
    "Your workspace and its data are untouched. Deployed agents keep serving until the credit allowance for this period is used.",
  ];
  const action = { label: "Update payment method", url: `${input.appUrl}/dashboard/billing` };
  return { subject: "Action needed: payment failed", text: plain(heading, paragraphs, action), html: layout(heading, paragraphs, action) };
}

export const __testables = { escapeHtml };
