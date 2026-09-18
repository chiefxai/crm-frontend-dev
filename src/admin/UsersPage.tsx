import React, { useEffect, useMemo, useState } from 'react';
import { Search, Loader2, Users as UsersIcon, UserX } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { UserRow } from './types';
import Widget from '../components/ui/Widget';

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    apiFetch('/api/platform/users')
      .then((r) => r.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.email.toLowerCase().includes(q) || (u.orgName || '').toLowerCase().includes(q));
  }, [users, query]);

  const unassignedCount = useMemo(() => users.filter((u) => !u.orgName).length, [users]);

  return (
    <div className="grid grid-cols-12 gap-4">
      <Widget colSpan={3} icon={UsersIcon} accent="#2a78d6" padding="md">
        <span className="text-xs font-medium text-slate-500 dark:text-[var(--text-secondary)]">Registered users</span>
        <div className="text-2xl font-semibold text-slate-900 dark:text-[var(--text-primary)] mt-1">{users.length}</div>
      </Widget>
      <Widget colSpan={3} icon={UserX} accent="#e11d48" padding="md">
        <span className="text-xs font-medium text-slate-500 dark:text-[var(--text-secondary)]">Unassigned to an org</span>
        <div className="text-2xl font-semibold text-slate-900 dark:text-[var(--text-primary)] mt-1">{unassignedCount}</div>
      </Widget>

      <Widget
        colSpan={12}
        title="All users"
        scrollable
        action={
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search users or organizations…"
              className="w-72 bg-slate-50 dark:bg-[var(--bg-subtle)] border border-slate-200 dark:border-[var(--border)] rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
        }
      >
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-[var(--border)] text-left text-[10px] font-bold text-slate-400 dark:text-[var(--text-muted)] uppercase tracking-wide">
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Organization</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Signed Up</th>
                <th className="px-5 py-3">Last Sign-in</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-slate-50 dark:border-[var(--border)] last:border-0">
                  <td className="px-5 py-3 font-medium text-slate-700 dark:text-[var(--text-primary)]">{u.email}</td>
                  <td className="px-5 py-3 text-slate-500 dark:text-[var(--text-secondary)]">{u.orgName || <span className="text-rose-400">unassigned</span>}</td>
                  <td className="px-5 py-3 text-slate-500 dark:text-[var(--text-secondary)]">{u.role || '—'}</td>
                  <td className="px-5 py-3 text-slate-400 dark:text-[var(--text-muted)] text-xs whitespace-nowrap">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3 text-slate-400 dark:text-[var(--text-muted)] text-xs whitespace-nowrap">{u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleString() : 'never'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400 dark:text-[var(--text-muted)] text-xs">No users match "{query}"</td></tr>
              )}
            </tbody>
          </table>
        )}
      </Widget>
    </div>
  );
}
