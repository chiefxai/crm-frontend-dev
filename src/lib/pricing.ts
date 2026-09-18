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

// ── Cross-currency conversion (static rate, no live FX feed yet) ────────
// Gemini Live's own usage/cost tracking (src/ai/geminiUsageTracker.js) is
// always billed and reported in USD — that's Google's real invoice
// currency, not something this app controls. Showing that number with a
// ₹ symbol slapped on it would be wrong (same value, wrong currency);
// showing $ next to it would be inconsistent with the rest of Billing &
// Usage, which is INR. So it needs an actual conversion, not just a
// symbol swap. No live exchange-rate API is wired up yet, so this is a
// static approximate rate — the one thing to update once one is.
export const USD_TO_INR_RATE = 83;

export function convertToDisplayCurrency(amount: number, sourceCurrency: string): number {
  const from = sourceCurrency.toUpperCase();
  if (from === DISPLAY_CURRENCY) return amount;
  if (from === 'USD' && DISPLAY_CURRENCY === 'INR') return amount * USD_TO_INR_RATE;
  return amount;
}
