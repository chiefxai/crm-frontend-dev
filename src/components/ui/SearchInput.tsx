import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchInput({ value, onChange, placeholder = 'Search…', className = '' }: SearchInputProps) {
  return (
    <div className={`relative flex items-center ${className}`}>
      <Search className="absolute left-3 h-3.5 w-3.5 text-slate-400 dark:text-[var(--text-muted)] pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-8.5 pr-7 py-1.5 text-sm rounded-xl border border-slate-200 dark:border-[var(--border)] bg-white dark:bg-[var(--bg-surface)] text-slate-700 dark:text-[var(--text-primary)] placeholder-slate-400 dark:placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-2 p-0.5 text-slate-400 hover:text-slate-600 dark:text-[var(--text-muted)] dark:hover:text-[var(--text-primary)] rounded"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
