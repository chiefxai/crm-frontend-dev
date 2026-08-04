import React, { useEffect, useMemo, useState } from 'react';
import { Search, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { CallRow } from './types';

export default function CallsPage() {
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [orgFilter, setOrgFilter] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/api/platform/calls')
      .then((r) => r.json())
      .then((data) => setCalls(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  const orgNames = useMemo(() => {
    const names = new Set(calls.map((c) => c.orgName).filter(Boolean));
    return Array.from(names).sort();
  }, [calls]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return calls.filter((c) => {
      if (orgFilter && c.orgName !== orgFilter) return false;
      if (!q) return true;
      return (c.orgName || '').toLowerCase().includes(q) || (c.callerNumber || '').toLowerCase().includes(q) || (c.agentName || '').toLowerCase().includes(q);
    });
  }, [calls, query, orgFilter]);

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by org, number, or agent…"
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
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No calls match the current filters.</div>
        ) : (
          filtered.map((c) => (
            <div key={c.id} className="border-b border-slate-50 last:border-0">
              <button
                onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{c.orgName}</span>
                  <span className="text-sm text-slate-700">{c.callerNumber || 'Unknown'}</span>
                  <span className="text-xs text-slate-400">{c.agentName} · {c.durationSeconds}s</span>
                  {c.sentiment && <span className="text-[10px] font-bold text-slate-500">{c.sentiment}</span>}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  {new Date(c.createdAt).toLocaleString()}
                  {expanded === c.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </div>
              </button>
              {expanded === c.id && (
                <div className="px-5 pb-4 space-y-3">
                  {c.recordingUrl && (
                    <audio controls className="w-full h-8">
                      <source src={c.recordingUrl} />
                    </audio>
                  )}
                  {c.summary && <div className="text-xs bg-indigo-50 text-indigo-800 rounded-lg p-3"><strong>Summary:</strong> {c.summary}</div>}
                  {c.transcript && (
                    <pre className="text-xs bg-slate-50 rounded-lg p-3 whitespace-pre-wrap max-h-64 overflow-y-auto font-sans">{c.transcript}</pre>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
