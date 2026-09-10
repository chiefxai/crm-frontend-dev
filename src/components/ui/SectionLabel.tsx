import React from 'react';

interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export default function SectionLabel({ children, className = '', action }: SectionLabelProps) {
  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      <span className="text-[10px] font-bold text-slate-400 dark:text-[var(--text-muted)] uppercase tracking-wider">
        {children}
      </span>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
