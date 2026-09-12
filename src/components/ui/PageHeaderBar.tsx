import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useRefresh } from '../../lib/RefreshContext';
import { usePageHeaderContext } from '../../lib/PageHeaderContext';

// Permanently-mounted counterpart to PageShell's header markup — rendered
// once in App.tsx so switching tabs (which unmounts/remounts the whole view,
// PageShell included) only swaps the title/subtitle/action content here
// instead of tearing down and rebuilding the header DOM itself.
export default function PageHeaderBar() {
  const ctx = usePageHeaderContext();
  const refresh = useRefresh();
  const [spinning, setSpinning] = React.useState(false);

  const header = ctx?.header;
  if (!header) return null;

  const handleRefresh = () => {
    if (!refresh || spinning) return;
    setSpinning(true);
    refresh();
    setTimeout(() => setSpinning(false), 800);
  };

  return (
    <>
      <div className="shrink-0 px-8 py-4 flex items-center justify-between gap-4 border-b border-slate-100 dark:border-[var(--border)] bg-white dark:bg-[var(--bg-surface)]">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-[var(--text-primary)] leading-snug truncate">
            {header.title}
          </h1>
          {header.subtitle && (
            <p className="text-xs text-slate-400 dark:text-[var(--text-muted)] mt-0.5 truncate">{header.subtitle}</p>
          )}
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {refresh && (
            <button
              onClick={handleRefresh}
              title="Refresh"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-[var(--bg-subtle)] transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${spinning ? 'animate-spin' : ''}`} />
            </button>
          )}
          {header.action && header.action}
        </div>
      </div>

      {header.toolbar && (
        <div className="shrink-0 px-8 py-2.5 border-b border-slate-100 dark:border-[var(--border)] bg-slate-50/60 dark:bg-[var(--bg-subtle)] flex items-center gap-3 flex-wrap">
          {header.toolbar}
        </div>
      )}
    </>
  );
}
