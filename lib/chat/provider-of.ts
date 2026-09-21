/**
 * The provider half of the `provider:model` identifier `runAgentChat` returns.
 *
 * Run traces used to record a hardcoded `provider: "anthropic"` regardless of
 * which provider actually served the request, which meant the provider
 * breakdown in analytics attributed every run to a provider that may never
 * have been called. The real value was already in the result; only this split
 * was missing.
 */
export function providerOf(providerAndModel: string): string {
  const separator = providerAndModel.indexOf(":");
  return separator > 0 ? providerAndModel.slice(0, separator) : providerAndModel;
}

/** The model half, keeping any colons that belong to the model id itself. */
export function modelOf(providerAndModel: string): string {
  const separator = providerAndModel.indexOf(":");
  return separator > 0 ? providerAndModel.slice(separator + 1) : providerAndModel;
}
