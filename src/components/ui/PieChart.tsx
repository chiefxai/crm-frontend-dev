import React from 'react';

export interface PieChartSlice {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  slices: PieChartSlice[];
  /** Outer diameter in px */
  size?: number;
  /** Inner hole radius as a fraction of the outer radius (0 = solid pie, >0 = donut) */
  innerRadiusRatio?: number;
  /** Content rendered in the center of the chart (only meaningful when innerRadiusRatio > 0) */
  centerLabel?: React.ReactNode;
  className?: string;
}

// Reusable SVG pie/donut chart — pure presentation, no external chart
// library. Takes pre-aggregated {label, value, color} slices so any page
// (Reports, Dashboard, etc.) can feed it its own breakdown.
export default function PieChart({ slices, size = 160, innerRadiusRatio = 0.6, centerLabel, className = '' }: PieChartProps) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const radius = size / 2;
  const strokeWidth = radius * (1 - innerRadiusRatio);
  const circumference = 2 * Math.PI * (radius - strokeWidth / 2);

  if (total <= 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-full ${className}`}
        style={{ width: size, height: size, background: 'var(--bg-subtle)' }}
      >
        <span className="text-[11px] text-[var(--text-muted)]">No data</span>
      </div>
    );
  }

  let offsetAccumulated = 0;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {slices.filter(s => s.value > 0).map((slice, idx) => {
          const fraction = slice.value / total;
          const dash = fraction * circumference;
          const gap = circumference - dash;
          const dashoffset = -offsetAccumulated;
          offsetAccumulated += dash;
          return (
            <circle
              key={idx}
              cx={radius}
              cy={radius}
              r={radius - strokeWidth / 2}
              fill="none"
              stroke={slice.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={dashoffset}
            >
              <title>{`${slice.label}: ${slice.value}`}</title>
            </circle>
          );
        })}
      </svg>
      {innerRadiusRatio > 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          {centerLabel ?? (
            <div className="text-center">
              <p className="text-lg font-bold text-[var(--text-primary)]">{total}</p>
              <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-wide">Total</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
