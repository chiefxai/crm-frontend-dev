// Flat per-minute AI voice cost, billed in INR. Not tied to any real
// payment processor (see billingEngine.js on the backend) — this is
// purely a cost estimate derived from real call duration, computed
// client-side wherever it's displayed rather than stored per-call.
//
// The REAL rate is admin-configurable (services/pricing.js, set live from
// the super admin panel) and fetched once via GET /api/billing — App.tsx
// does this and threads `costPerMinuteInr` down as a prop. This constant
// is only the fallback used for the one render before that fetch
// resolves, not a value to compute real costs from.
export const COST_PER_MINUTE_INR_FALLBACK = 6;

export function callCostInr(durationSeconds: number, ratePerMinute: number = COST_PER_MINUTE_INR_FALLBACK): number {
  return Math.round((durationSeconds / 60) * ratePerMinute * 100) / 100;
}

export function formatInr(amount: number): string {
  return `₹${amount.toFixed(2)}`;
}

// ── Display currency (abstracted, not per-org configurable yet) ─────────
// Every price on Billing & Usage is shown in one currency for now — INR,
// since that's the org's real billing currency (see COST_PER_MINUTE_INR_FALLBACK
// above). This is the single place that picks it: once the backend grows
// a real per-org currency setting, only DISPLAY_CURRENCY needs to change
// (or become a lookup) — nothing that calls formatCurrency does.
export type CurrencyCode = 'INR' | 'USD';
export const DISPLAY_CURRENCY: CurrencyCode = 'INR';

const CURRENCY_SYMBOL: Record<CurrencyCode, string> = {
  INR: '₹',
  USD: '$',
};

export function currencySymbol(currency: CurrencyCode = DISPLAY_CURRENCY): string {
  return CURRENCY_SYMBOL[currency];
}

export function formatCurrency(amount: number, opts?: { currency?: CurrencyCode; decimals?: number }): string {
  const currency = opts?.currency ?? DISPLAY_CURRENCY;
  const decimals = opts?.decimals ?? 2;
  return `${currencySymbol(currency)}${amount.toFixed(decimals)}`;
}
