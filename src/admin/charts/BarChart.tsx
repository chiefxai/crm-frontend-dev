import React, { useState } from 'react';

interface Point { date: string; count: number }

// Single-series daily volume. Bars capped at 24px, 4px rounded data-end,
// square at the baseline, 2px surface gap between neighbors, hairline
// gridlines, per-bar hover tooltip.
export default function BarChart({ data, color = '#eb6834' }: { data: Point[]; color?: string }) {
  const width = 560;
  const height = 160;
  const padL = 8, padR = 8, padT = 12, padB = 20;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (!data.length) return <div className="text-xs text-slate-400 py-8 text-center">No data yet</div>;

  const maxVal = Math.max(1, ...data.map((d) => d.count));
  const slot = plotW / data.length;
  const barWidth = Math.min(24, slot - 2);
  const yFor = (v: number) => padT + plotH - (v / maxVal) * plotH;

  const gridLines = [0, 0.5, 1];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40" onMouseLeave={() => setHoverIdx(null)}>
        {gridLines.map((g) => (
          <line key={g} x1={padL} x2={width - padR} y1={padT + plotH * (1 - g)} y2={padT + plotH * (1 - g)} stroke="#e1e0d9" strokeWidth={1} />
        ))}
        {data.map((d, i) => {
          const x = padL + i * slot + (slot - barWidth) / 2;
          const barH = Math.max(0, plotH - (yFor(d.count) - padT));
          const y = yFor(d.count);
          const r = d.count > 0 ? 4 : 0;
          return (
            <path
              key={i}
              d={`M ${x} ${padT + plotH} L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} L ${x + barWidth - r} ${y} Q ${x + barWidth} ${y} ${x + barWidth} ${y + r} L ${x + barWidth} ${padT + plotH} Z`}
              fill={hoverIdx === i ? color : color}
              opacity={hoverIdx === null || hoverIdx === i ? 1 : 0.55}
            />
          );
        })}
        {data.map((d, i) => (
          <rect
            key={`hit-${i}`}
            x={padL + i * slot}
            y={padT}
            width={slot}
            height={plotH}
            fill="transparent"
            onMouseEnter={() => setHoverIdx(i)}
          />
        ))}
      </svg>
      {hoverIdx !== null && (
        <div
          className="absolute bg-slate-900 text-white text-[10px] rounded-lg px-2 py-1 pointer-events-none -translate-x-1/2 -translate-y-full shadow-lg"
          style={{ left: `${((padL + hoverIdx * slot + slot / 2) / width) * 100}%`, top: `${(yFor(data[hoverIdx].count) / height) * 100}%` }}
        >
          <div className="font-semibold">{data[hoverIdx].count}</div>
          <div className="text-slate-400">{new Date(data[hoverIdx].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
        </div>
      )}
      <div className="flex justify-between text-[10px] text-slate-400 mt-1 px-1">
        <span>{new Date(data[0].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
        <span>{new Date(data[data.length - 1].date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  );
}
