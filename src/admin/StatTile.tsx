import React from 'react';

interface StatTileProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent?: string;
}

// Stat tile contract per the dataviz skill: sentence-case label, no
// trailing colon; semibold auto-compact value; optional icon as the
// only color accent (value stays in text-primary ink, never colored).
export default function StatTile({ label, value, icon: Icon, accent = '#2a78d6' }: StatTileProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accent}1a` }}>
          <Icon className="h-4 w-4" style={{ color: accent }} />
        </div>
      </div>
      <div className="text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  );
}
