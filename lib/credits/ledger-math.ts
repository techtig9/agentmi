// This mirrors the arithmetic inside supabase/functions.sql's
// consume_credits()/grant_credits() RPCs. It's duplicated intentionally:
// the DB function is the actual source of truth (it's what runs
// atomically against real balances), but keeping the same math here in
// pure TS means the logic is unit-tested on every commit without needing
// a live database.

export interface CreditCheckResult {
  allowed: boolean;
  balanceAfter: number;
  shortfall: number; // 0 if allowed
}

export function canAfford(currentBalance: number, cost: number): CreditCheckResult {
  if (cost < 0) throw new Error("cost must be non-negative");

  const allowed = currentBalance >= cost;
  return {
    allowed,
    balanceAfter: allowed ? currentBalance - cost : currentBalance,
    shortfall: allowed ? 0 : cost - currentBalance,
  };
}

export function applyGrant(currentBalance: number, amount: number): number {
  if (amount < 0) throw new Error("grant amount must be non-negative");
  return currentBalance + amount;
}
