import React, { useEffect, useMemo, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { UserRow } from './types';

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

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users or organizations…"
          className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                <th className="px-5 py-3">Email</th>
                <th className="px-5 py-3">Organization</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Signed Up</th>
                <th className="px-5 py-3">Last Sign-in</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-5 py-3 font-medium text-slate-700">{u.email}</td>
                  <td className="px-5 py-3 text-slate-500">{u.orgName || <span className="text-rose-400">unassigned</span>}</td>
                  <td className="px-5 py-3 text-slate-500">{u.role || '—'}</td>
                  <td className="px-5 py-3 text-slate-400 text-xs whitespace-nowrap">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-5 py-3 text-slate-400 text-xs whitespace-nowrap">{u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleString() : 'never'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400 text-xs">No users match "{query}"</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
