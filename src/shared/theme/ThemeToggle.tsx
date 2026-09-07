import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor, ChevronDown } from 'lucide-react';
import { useTheme, ThemeMode } from './ThemeContext';

const OPTIONS: { mode: ThemeMode; icon: React.ReactNode; label: string }[] = [
  { mode: 'light', icon: <Sun className="h-3.5 w-3.5" />, label: 'Light' },
  { mode: 'dark',  icon: <Moon className="h-3.5 w-3.5" />, label: 'Dark' },
  { mode: 'system', icon: <Monitor className="h-3.5 w-3.5" />, label: 'System' },
];

export default function ThemeToggle() {
  const { mode, resolved, setMode } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = OPTIONS.find(o => o.mode === mode) ?? OPTIONS[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-medium transition-colors"
        title="Switch theme"
      >
        {current.icon}
        <span className="hidden sm:inline">{current.label}</span>
        <ChevronDown className="h-3 w-3 text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden z-50">
          {OPTIONS.map(opt => (
            <button
              key={opt.mode}
              onClick={() => { setMode(opt.mode); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-medium transition-colors ${
                mode === opt.mode
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {opt.icon}
              {opt.label}
              {opt.mode === 'system' && (
                <span className="ml-auto text-[9px] text-slate-400 font-mono">
                  ({resolved === 'dark' ? '🌙' : '☀️'})
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
