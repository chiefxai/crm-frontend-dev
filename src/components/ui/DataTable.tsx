import React, { useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T, index: number) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  className?: string;
  /** Render inside an existing Card (no outer border/rounding) */
  bare?: boolean;
  /** Extra classes applied to a specific row's <tr> (e.g. highlighting a call in progress) */
  rowClassName?: (row: T, index: number) => string;
  /**
   * Lets the user drag each column header's right edge to resize it.
   * Widths are kept in this component's own state, seeded from each
   * column's `width` (parsed as a px number when possible, otherwise an
   * even split of the table). Off by default so existing tables keep
   * their current auto-sizing behavior unless a page opts in.
   */
  resizable?: boolean;
  /** Minimum column width in px while resizing (default 60) */
  minColWidth?: number;
}

const MIN_COL_WIDTH_DEFAULT = 60;

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  emptyMessage = 'No data to display.',
  onRowClick,
  className = '',
  bare = false,
  rowClassName,
  resizable = false,
  minColWidth = MIN_COL_WIDTH_DEFAULT,
}: DataTableProps<T>) {
  // bare=true: no card chrome, no overflow wrapper (caller's scroll container handles it)
  const wrapper = bare
    ? className
    : `bg-white dark:bg-[var(--bg-surface)] rounded-2xl border border-slate-200 dark:border-[var(--border)] shadow-sm overflow-hidden ${className}`;

  // Column widths (px), keyed by column key — only populated once a column
  // has actually been resized or (for resizable tables) on first render, so
  // non-resizable tables never pay for this state at all.
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const resizeState = useRef<{ key: string; startX: number; startWidth: number } | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  const parseWidth = (w?: string): number | undefined => {
    if (!w) return undefined;
    const n = parseFloat(w);
    return Number.isFinite(n) && w.trim().endsWith('px') ? n : undefined;
  };

  const startResize = (e: React.MouseEvent, colKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    const th = (e.currentTarget as HTMLElement).closest('th');
    const startWidth = colWidths[colKey] ?? parseWidth(columns.find(c => c.key === colKey)?.width) ?? th?.getBoundingClientRect().width ?? 120;
    resizeState.current = { key: colKey, startX: e.clientX, startWidth };

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!resizeState.current) return;
      const delta = moveEvent.clientX - resizeState.current.startX;
      const next = Math.max(minColWidth, resizeState.current.startWidth + delta);
      setColWidths(prev => ({ ...prev, [resizeState.current!.key]: next }));
    };
    const onMouseUp = () => {
      resizeState.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div className={wrapper}>
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      ) : (
        <table ref={tableRef} className="w-full text-sm" style={resizable ? { tableLayout: 'fixed' } : undefined}>
          <thead className="sticky top-0 z-10" style={{ background: 'var(--bg-surface)' }}>
            <tr className="border-b border-slate-100 dark:border-[var(--border)]">
              {columns.map(col => {
                const resizedWidth = colWidths[col.key];
                const width = resizedWidth ? `${resizedWidth}px` : col.width;
                return (
                  <th
                    key={col.key}
                    className={`relative px-5 py-3 text-[10px] font-bold text-slate-400 dark:text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                    style={width ? { width } : undefined}
                  >
                    {col.header}
                    {resizable && (
                      <span
                        onMouseDown={(e) => startResize(e, col.key)}
                        className="absolute top-0 right-0 h-full w-2 cursor-col-resize select-none hover:bg-blue-500/20 active:bg-blue-500/30"
                        title="Drag to resize column"
                      />
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-12 text-center text-sm text-slate-400 dark:text-[var(--text-muted)]">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={`border-b border-slate-50 dark:border-[var(--border-subtle)] last:border-0 transition-colors duration-100 ${onRowClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-[var(--bg-subtle)]' : ''} ${rowClassName ? rowClassName(row, i) : ''}`}
                >
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className={`px-5 py-3 text-slate-700 dark:text-[var(--text-secondary)] ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''} ${resizable ? 'overflow-hidden truncate' : ''}`}
                    >
                      {col.cell(row, i)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
