import React, { useRef, useState } from 'react';

// Generic hover tooltip — reuses the app's existing theme-tooltip CSS
// (see Sidebar.tsx's CollapsedTooltip, which this generalizes: same
// positioning technique, but configurable side instead of hardcoded
// "always to the right" so it also works for header icon buttons that
// aren't pinned to the screen's left edge).
type Side = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  label: string;
  side?: Side;
  children: React.ReactNode;
}

export default function Tooltip({ label, side = 'bottom', children }: TooltipProps) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const handleEnter = () => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const positions: Record<Side, { top: number; left: number }> = {
      top:    { top: r.top - 8,               left: r.left + r.width / 2 },
      bottom: { top: r.bottom + 8,            left: r.left + r.width / 2 },
      left:   { top: r.top + r.height / 2,    left: r.left - 8 },
      right:  { top: r.top + r.height / 2,    left: r.right + 8 },
    };
    setPos(positions[side]);
  };

  const transforms: Record<Side, string> = {
    top: 'translate(-50%, -100%)',
    bottom: 'translate(-50%, 0)',
    left: 'translate(-100%, -50%)',
    right: 'translate(0, -50%)',
  };

  return (
    <div ref={ref} className="relative inline-flex" onMouseEnter={handleEnter} onMouseLeave={() => setPos(null)}>
      {children}
      {pos && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{ top: pos.top, left: pos.left, transform: transforms[side] }}
        >
          <div className="theme-tooltip text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
            {label}
          </div>
        </div>
      )}
    </div>
  );
}
