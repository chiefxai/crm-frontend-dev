import React, { useState } from 'react';

interface Point { date: string; count: number }

// Single-series trend line. Follows the dataviz mark specs: 2px line,
// round caps, ~10% area wash, hairline recessive gridlines, end-marker
// with a surface ring, and a hover crosshair + tooltip (no legend needed
// for one series — the card title already names it).
export default function LineChart({ data, color = '#2a78d6' }: { data: Point[]; color?: string }) {
  const width = 560;
  const height = 160;
  const padL = 8, padR = 8, padT = 12, padB = 20;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (!data.length) return <div className="text-xs text-slate-400 py-8 text-center">No data yet</div>;

  const maxVal = Math.max(1, ...data.map((d) => d.count));
  const stepX = data.length > 1 ? plotW / (data.length - 1) : 0;
  const yFor = (v: number) => padT + plotH - (v / maxVal) * plotH;
  const xFor = (i: number) => padL + i * stepX;

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i)} ${yFor(d.count)}`).join(' ');
  const areaPath = `${linePath} L ${xFor(data.length - 1)} ${padT + plotH} L ${xFor(0)} ${padT + plotH} Z`;

  const gridLines = [0, 0.5, 1];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40" onMouseLeave={() => setHoverIdx(null)}>
        {gridLines.map((g) => (
          <line key={g} x1={padL} x2={width - padR} y1={padT + plotH * (1 - g)} y2={padT + plotH * (1 - g)} stroke="#e1e0d9" strokeWidth={1} />
        ))}
        <path d={areaPath} fill={color} opacity={0.1} />
        <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hoverIdx !== null && (
          <line x1={xFor(hoverIdx)} x2={xFor(hoverIdx)} y1={padT} y2={padT + plotH} stroke="#c3c2b7" strokeWidth={1} />
        )}
        {data.map((d, i) => (
          <circle
            key={i}
            cx={xFor(i)}
            cy={yFor(d.count)}
            r={hoverIdx === i ? 5 : 0}
            fill={color}
            stroke="#fcfcfb"
            strokeWidth={2}
          />
        ))}
        {/* invisible wide hit targets for hover */}
        {data.map((d, i) => (
          <rect
            key={`hit-${i}`}
            x={xFor(i) - stepX / 2}
            y={padT}
            width={stepX || plotW}
            height={plotH}
            fill="transparent"
            onMouseEnter={() => setHoverIdx(i)}
          />
        ))}
      </svg>
      {hoverIdx !== null && (
        <div
          className="absolute bg-slate-900 text-white text-[10px] rounded-lg px-2 py-1 pointer-events-none -translate-x-1/2 -translate-y-full shadow-lg"
          style={{ left: `${(xFor(hoverIdx) / width) * 100}%`, top: `${(yFor(data[hoverIdx].count) / height) * 100}%` }}
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
