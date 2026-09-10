import React from 'react';
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
}

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  emptyMessage = 'No data to display.',
  onRowClick,
  className = '',
  bare = false,
}: DataTableProps<T>) {
  // bare=true: no card chrome, no overflow wrapper (caller's scroll container handles it)
  const wrapper = bare
    ? className
    : `bg-white dark:bg-[var(--bg-surface)] rounded-2xl border border-slate-200 dark:border-[var(--border)] shadow-sm overflow-hidden ${className}`;

  return (
    <div className={wrapper}>
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10" style={{ background: 'var(--bg-surface)' }}>
            <tr className="border-b border-slate-100 dark:border-[var(--border)]">
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`px-5 py-3 text-[10px] font-bold text-slate-400 dark:text-[var(--text-muted)] uppercase tracking-widest whitespace-nowrap ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </th>
              ))}
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
                  className={`border-b border-slate-50 dark:border-[var(--border-subtle)] last:border-0 transition-colors duration-100 ${onRowClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-[var(--bg-subtle)]' : ''}`}
                >
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className={`px-5 py-3 text-slate-700 dark:text-[var(--text-secondary)] ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}
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
