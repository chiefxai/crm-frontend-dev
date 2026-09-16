// Client-generated ids for rows created locally before the backend
// assigns/accepts a real one (leads, and previously virtual numbers hit
// the same bug — see repository.js's replaceNumbers comment). `id` on
// these tables is a single global primary key, not scoped per org, so a
// deterministic id like `L-${100 + leads.length + 1}` collides the moment
// two different orgs each create their first contact ("L-101" for both) —
// confirmed live via a "duplicate key value violates unique constraint
// leads_pkey" 500 on /api/leads/sync. Crypto-random suffix instead, so
// collisions across orgs (or within one org across browser tabs) are
// vanishingly unlikely regardless of how many rows already exist locally.
export function newClientId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
