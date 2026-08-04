import React from 'react';

// Fixed categorical order (never cycled/reassigned) — see dataviz skill's
// color-formula.md. Capped at what a plan/industry breakdown realistically
// needs; a category beyond this count folds into "Other" rather than
// generating a new hue.
const CATEGORICAL = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];

interface Row { label: string; count: number }

// Ranked horizontal-bar breakdown (plan mix, industry mix). Each row is
// directly labeled with its category name and count, so no separate
// legend box is needed — the row label already carries identity.
export default function DistributionBars({ rows }: { rows: Row[] }) {
  const sorted = [...rows].sort((a, b) => b.count - a.count);
  const max = Math.max(1, ...sorted.map((r) => r.count));
  const total = sorted.reduce((s, r) => s + r.count, 0) || 1;

  return (
    <div className="space-y-3">
      {sorted.map((row, i) => (
        <div key={row.label}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-medium text-slate-700">{row.label}</span>
            <span className="text-slate-400">{row.count} · {Math.round((row.count / total) * 100)}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(row.count / max) * 100}%`, backgroundColor: CATEGORICAL[i % CATEGORICAL.length] }}
            />
          </div>
        </div>
      ))}
      {sorted.length === 0 && <div className="text-xs text-slate-400 py-4 text-center">No data yet</div>}
    </div>
  );
}
