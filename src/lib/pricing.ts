// Flat per-minute AI voice cost, billed in INR. Not tied to any real
// payment processor (see billingEngine.js on the backend) — this is
// purely a cost estimate derived from real call duration, computed
// client-side wherever it's displayed rather than stored per-call.
export const COST_PER_MINUTE_INR = 4;

export function callCostInr(durationSeconds: number): number {
  return Math.round((durationSeconds / 60) * COST_PER_MINUTE_INR * 100) / 100;
}

export function formatInr(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}
