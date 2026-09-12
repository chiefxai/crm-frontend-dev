import React, { useEffect, useMemo, useState } from 'react';
import { Search, Loader2, ChevronUp, ChevronDown, Plus } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { OrgRow } from './types';
import OrgDetailPanel from './OrgDetailPanel';
import { formatInr } from '../lib/pricing';
import { FEATURE_REGISTRY } from '../features/feature-flags/registry';
import Modal from '../components/ui/Modal';
import FlagGroupPicker from '../components/ui/FlagGroupPicker';

type SortKey = 'name' | 'industry' | 'subscriptionPlan' | 'memberCount' | 'leadCount' | 'createdAt';

const INDUSTRIES = [
  { value: 'lending', label: 'Lending' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'retail', label: 'Retail' },
  { value: 'education', label: 'Education' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'other', label: 'Other' },
];

const PLANS = ['Starter', 'Growth', 'Enterprise'];

interface CreateOrgForm {
  name: string;
  workspaceName: string;
  industry: string;
  subscriptionPlan: string;
  adminEmail: string;
  adminName: string;
}

function CreateWorkspaceModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<CreateOrgForm>({
    name: '',
    workspaceName: '',
    industry: 'lending',
    subscriptionPlan: 'Starter',
    adminEmail: '',
    adminName: '',
  });
  const [selectedFlags, setSelectedFlags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleFlag = (key: string) => {
    setSelectedFlags(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const set = (field: keyof CreateOrgForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await apiFetch('/api/platform/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, featureFlags: selectedFlags }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'Failed to create workspace');
        return;
      }
      onCreated();
      onClose();
    } catch {
      setError('Could not reach the server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Create Workspace" maxWidth="max-w-md">
        {error && (
          <div className="mb-4 bg-rose-50 border border-rose-200 rounded-lg px-4 py-2 text-sm text-rose-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Organization Name *</label>
            <input
              value={form.name}
              onChange={set('name')}
              placeholder="Acme Corp"
              required
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Workspace Slug *</label>
            <input
              value={form.workspaceName}
              onChange={set('workspaceName')}
              placeholder="acme-corp"
              required
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Industry</label>
              <select
                value={form.industry}
                onChange={set('industry')}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                {INDUSTRIES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Plan</label>
              <select
                value={form.subscriptionPlan}
                onChange={set('subscriptionPlan')}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-400 mb-3">
              Admin member (optional) — they'll be linked automatically on first login
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Admin Email</label>
                <input
                  type="email"
                  value={form.adminEmail}
                  onChange={set('adminEmail')}
                  placeholder="admin@acme.com"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Admin Name</label>
                <input
                  value={form.adminName}
                  onChange={set('adminName')}
                  placeholder="Jane Smith"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-medium text-slate-500 mb-2">Feature Access — select what this org can use</p>
            <FlagGroupPicker
              availableKeys={FEATURE_REGISTRY.map(f => f.key)}
              onApply={(keys) => setSelectedFlags(keys)}
              className="mb-3"
            />
            <div className="flex flex-wrap gap-2">
              {FEATURE_REGISTRY.map(f => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => toggleFlag(f.key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    selectedFlags.includes(f.key)
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-amber-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {selectedFlags.length === 0 && (
              <p className="text-[10px] text-slate-400 mt-1">No flags selected — org will have no feature access by default.</p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-white text-sm font-medium rounded-xl flex items-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Creating…' : 'Create Workspace'}
            </button>
          </div>
        </form>
    </Modal>
  );
}

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const loadOrgs = () => {
    setLoading(true);
    apiFetch('/api/platform/organizations')
      .then((r) => r.json())
      .then((data) => setOrgs(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  };

  useEffect(loadOrgs, []);

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
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search organizations…"
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-white text-sm font-medium rounded-xl"
        >
          <Plus className="h-4 w-4" />
          Create Workspace
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                <SortHeader label="Organization" sortKeyName="name" />
                <th className="px-5 py-3">Status</th>
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
                  <td className="px-5 py-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${o.status === 'Suspended' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {o.status || 'Active'}
                    </span>
                  </td>
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
                <tr><td colSpan={9} className="px-5 py-8 text-center text-slate-400 text-xs">
                  {query ? `No organizations match "${query}"` : 'No workspaces yet. Create one above.'}
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {selectedOrgId && (
        <OrgDetailPanel
          orgId={selectedOrgId}
          onClose={() => setSelectedOrgId(null)}
          onChanged={loadOrgs}
        />
      )}

      {showCreate && (
        <CreateWorkspaceModal
          onClose={() => setShowCreate(false)}
          onCreated={loadOrgs}
        />
      )}
    </div>
  );
}
