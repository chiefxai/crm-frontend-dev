import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useRefresh } from '../../lib/RefreshContext';
import { usePageHeaderContext } from '../../lib/PageHeaderContext';

// ── Grid helpers ──────────────────────────────────────────────────────────────

/** Tailwind col-span class map for 1–12 columns */
export const COL_SPAN: Record<number, string> = {
  1:  'col-span-1',
  2:  'col-span-2',
  3:  'col-span-3',
  4:  'col-span-4',
  5:  'col-span-5',
  6:  'col-span-6',
  7:  'col-span-7',
  8:  'col-span-8',
  9:  'col-span-9',
  10: 'col-span-10',
  11: 'col-span-11',
  12: 'col-span-12',
};

interface GridRowProps {
  children: React.ReactNode;
  className?: string;
}

/** A 12-col sub-grid row for nested grids inside a PageShell */
export function GridRow({ children, className = '' }: GridRowProps) {
  return (
    <div className={`col-span-12 grid grid-cols-12 gap-6 ${className}`}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface PageShellProps {
  /** Page title shown as the large H1 */
  title: string;
  /** Short descriptive line under the title */
  subtitle?: string;
  /** Buttons / controls placed in the top-right of the header */
  action?: React.ReactNode;
  /** Secondary toolbar row (filters, tabs, search) rendered below the header */
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  /** Extra class on the outer wrapper */
  className?: string;
  /**
   * "grid" (default) — scrollable 12-col grid body; good for dashboards & list pages.
   * "fill"           — body is flex-1 flex flex-col overflow-hidden; children manage
   *                   their own overflow — use for split-pane layouts like Inbox.
   */
  layout?: 'grid' | 'fill';
  /** Called when the user clicks the refresh button — reload this page's data */
  onRefresh?: () => void;
}

export default function PageShell({ title, subtitle, action, toolbar, children, className = '', layout = 'grid', onRefresh }: PageShellProps) {
  const contextRefresh = useRefresh();
  const refresh = onRefresh ?? contextRefresh;
  const [spinning, setSpinning] = React.useState(false);
  const pageHeaderCtx = usePageHeaderContext();

  const handleRefresh = () => {
    if (!refresh || spinning) return;
    setSpinning(true);
    refresh();
    setTimeout(() => setSpinning(false), 800);
  };

  // When a PageHeaderProvider is present (the normal app shell), publish this
  // page's header content into the shared, permanently-mounted header bar
  // instead of rendering our own — see PageHeaderContext.tsx for why.
  React.useEffect(() => {
    if (!pageHeaderCtx) return;
    pageHeaderCtx.setHeader({ title, subtitle, action, toolbar, onRefresh: refresh });
    return () => pageHeaderCtx.setHeader(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageHeaderCtx, title, subtitle, action, toolbar, refresh]);

  const renderOwnHeader = !pageHeaderCtx;

  return (
    <div className={`flex flex-col h-full overflow-hidden ${className}`}>
      {/* ── Page header (only rendered here when there's no shared header slot) ── */}
      {renderOwnHeader && (
        <div className="shrink-0 px-8 py-4 flex items-center justify-between gap-4 border-b border-slate-100 dark:border-[var(--border)] bg-white dark:bg-[var(--bg-surface)]">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-[var(--text-primary)] leading-snug truncate">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-slate-400 dark:text-[var(--text-muted)] mt-0.5 truncate">{subtitle}</p>
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
            {action && action}
          </div>
        </div>
      )}

      {/* ── Optional toolbar (filters / search) — shown here only in standalone mode ── */}
      {renderOwnHeader && toolbar && (
        <div className="shrink-0 px-8 py-2.5 border-b border-slate-100 dark:border-[var(--border)] bg-slate-50/60 dark:bg-[var(--bg-subtle)] flex items-center gap-3 flex-wrap">
          {toolbar}
        </div>
      )}

      {/* ── Content area ── */}
      {layout === 'fill' ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {children}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="grid grid-cols-12 gap-6 content-start">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
