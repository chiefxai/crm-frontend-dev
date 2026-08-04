import React, { useEffect, useMemo, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { AuditRow } from './types';

export default function ActivityPage() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [orgFilter, setOrgFilter] = useState('');

  useEffect(() => {
    apiFetch('/api/platform/audit-log')
      .then((r) => r.json())
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  const orgNames = useMemo(() => {
    const names = new Set(rows.map((a) => a.orgName).filter(Boolean));
    return Array.from(names).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((a) => {
      if (orgFilter && a.orgName !== orgFilter) return false;
      if (!q) return true;
      return (a.orgName || '').toLowerCase().includes(q) || a.action.toLowerCase().includes(q) || (a.actorEmail || '').toLowerCase().includes(q);
    });
  }, [rows, query, orgFilter]);

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by org, action, or actor…"
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <select
          value={orgFilter}
          onChange={(e) => setOrgFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
        >
          <option value="">All organizations</option>
          {orgNames.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                <th className="px-5 py-3">Organization</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">By</th>
                <th className="px-5 py-3">When</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-5 py-3 font-medium text-slate-700">{a.orgName}</td>
                  <td className="px-5 py-3 text-slate-500">{a.action}</td>
                  <td className="px-5 py-3 text-slate-500">{a.actorEmail || '—'}</td>
                  <td className="px-5 py-3 text-slate-400 text-xs whitespace-nowrap">{new Date(a.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400 text-xs">No activity matches "{query}"</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
