import React, { useEffect, useMemo, useState } from 'react';
import { Search, Loader2, ChevronUp, ChevronDown } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { OrgRow } from './types';
import OrgDetailPanel from './OrgDetailPanel';
import { formatInr } from '../lib/pricing';

type SortKey = 'name' | 'industry' | 'subscriptionPlan' | 'memberCount' | 'leadCount' | 'createdAt';

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/api/platform/organizations')
      .then((r) => r.json())
      .then((data) => setOrgs(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = q ? orgs.filter((o) => o.name.toLowerCase().includes(q) || o.workspaceName.toLowerCase().includes(q) || o.industry.toLowerCase().includes(q)) : orgs;
    rows = [...rows].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey];
      const cmp = typeof av === 'string' ? String(av).localeCompare(String(bv)) : Number(av) - Number(bv);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [orgs, query, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortHeader = ({ label, sortKeyName }: { label: string; sortKeyName: SortKey }) => (
    <th className="px-5 py-3 cursor-pointer select-none hover:text-slate-600" onClick={() => handleSort(sortKeyName)}>
      <div className="flex items-center gap-1">
        {label}
        {sortKey === sortKeyName && (sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </div>
    </th>
  );

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search organizations…"
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
                <SortHeader label="Organization" sortKeyName="name" />
                <SortHeader label="Industry" sortKeyName="industry" />
                <SortHeader label="Plan" sortKeyName="subscriptionPlan" />
                <th className="px-5 py-3">AI Minutes</th>
                <th className="px-5 py-3">AI Cost</th>
                <SortHeader label="Members" sortKeyName="memberCount" />
                <SortHeader label="Leads" sortKeyName="leadCount" />
                <SortHeader label="Signed Up" sortKeyName="createdAt" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id} onClick={() => setSelectedOrgId(o.id)} className="border-b border-slate-50 last:border-0 cursor-pointer hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium text-slate-700">{o.name}<div className="text-[10px] text-slate-400 font-normal">{o.workspaceName}</div></td>
                  <td className="px-5 py-3 text-slate-500">{o.industry}</td>
                  <td className="px-5 py-3 text-slate-500">{o.subscriptionPlan}</td>
                  <td className="px-5 py-3 text-slate-500">{o.aiMinutesUsed}</td>
                  <td className="px-5 py-3 text-slate-500">{formatInr(o.totalCostInr)}</td>
                  <td className="px-5 py-3 text-slate-500">{o.memberCount}</td>
                  <td className="px-5 py-3 text-slate-500">{o.leadCount}</td>
                  <td className="px-5 py-3 text-slate-400 text-xs whitespace-nowrap">{new Date(o.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-8 text-center text-slate-400 text-xs">No organizations match "{query}"</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {selectedOrgId && <OrgDetailPanel orgId={selectedOrgId} onClose={() => setSelectedOrgId(null)} />}
    </div>
  );
}
