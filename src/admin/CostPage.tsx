import React, { useEffect, useState } from 'react';
import { Loader2, Save, Plus, Trash2, Phone, Cpu, Archive } from 'lucide-react';
import { apiFetch } from '../lib/api';

type CostProvider = {
  key: string;
  kind: 'call' | 'ai';
  label: string;
  active: boolean;
  taxPercent: number;
  // call kind
  rateUnit?: 'minute' | 'hour';
  rateAmount?: number;
  // ai kind
  ratePer1kTokens?: number;
  updatedAt?: string;
};

// A permanent cost snapshot taken right before an org was deleted — see
// backend platform/admin.js's deleteOrganization + db.archiveOrgCost.
// The org itself, its call logs, and its accrued counters are gone; this
// is the only place that org's final cost figures still exist.
type CostArchiveEntry = {
  id: string;
  orgId: string;
  orgName: string | null;
  workspaceName: string | null;
  industry: string | null;
  deletedAt: string;
  deletedByEmail: string | null;
  aiMinutesUsed: number | null;
  aiMinutesCostInr: number | null;
  phoneCharges: number | null;
  callProviderLabel: string | null;
  aiTotalTokens: number | null;
  aiTokenProviderLabel: string | null;
  aiTokenTotalCostInr: number | null;
};

function emptyDraft(kind: 'call' | 'ai'): Omit<CostProvider, 'key'> & { key: string } {
  return kind === 'call'
    ? { key: '', kind: 'call', label: '', active: true, taxPercent: 0, rateUnit: 'minute', rateAmount: 0 }
    : { key: '', kind: 'ai', label: '', active: true, taxPercent: 0, ratePer1kTokens: 0 };
}

export default function CostPage() {
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<CostProvider[]>([]);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [addingKind, setAddingKind] = useState<'call' | 'ai' | null>(null);
  const [draft, setDraft] = useState<ReturnType<typeof emptyDraft> | null>(null);
  const [error, setError] = useState('');
  const [archive, setArchive] = useState<CostArchiveEntry[]>([]);
  const [loadingArchive, setLoadingArchive] = useState(true);

  const load = () => {
    setLoading(true);
    apiFetch('/api/platform/cost-providers')
      .then((r) => r.json())
      .then((data) => setProviders(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));

    setLoadingArchive(true);
    apiFetch('/api/platform/cost-archive')
      .then((r) => r.json())
      .then((data) => setArchive(Array.isArray(data) ? data : []))
      .finally(() => setLoadingArchive(false));
  };

  useEffect(load, []);

  const callProviders = providers.filter((p) => p.kind === 'call');
  const aiProviders = providers.filter((p) => p.kind === 'ai');

  const updateLocal = (key: string, patch: Partial<CostProvider>) => {
    setProviders((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  };

  const saveProvider = async (provider: CostProvider) => {
    setSavingKey(provider.key);
    setError('');
    try {
      const res = await apiFetch(`/api/platform/cost-providers/${provider.key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(provider),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      updateLocal(provider.key, data);
      setSavedKey(provider.key);
      setTimeout(() => setSavedKey((k) => (k === provider.key ? null : k)), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to save provider');
    } finally {
      setSavingKey(null);
    }
  };

  const deleteProvider = async (key: string) => {
    if (!confirm(`Remove cost provider "${key}"? Orgs will stop seeing a rate/tax for it until a new one is added.`)) return;
    setDeletingKey(key);
    setError('');
    try {
      const res = await apiFetch(`/api/platform/cost-providers/${key}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete');
      setProviders((prev) => prev.filter((p) => p.key !== key));
    } catch (err: any) {
      setError(err.message || 'Failed to delete provider');
    } finally {
      setDeletingKey(null);
    }
  };

  const createProvider = async () => {
    if (!draft) return;
    setSavingKey('__new__');
    setError('');
    try {
      const res = await apiFetch('/api/platform/cost-providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create provider');
      setProviders((prev) => [...prev, data]);
      setAddingKind(null);
      setDraft(null);
    } catch (err: any) {
      setError(err.message || 'Failed to create provider');
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>;
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-xl px-4 py-3">{error}</div>
      )}

      <ProviderSection
        title="Call providers"
        description="Telephony providers, billed per minute or per hour, plus tax. This rate flows into every org's Billing & Usage as soon as it's set — no redeploy needed."
        icon={Phone}
        kind="call"
        providers={callProviders}
        savingKey={savingKey}
        savedKey={savedKey}
        deletingKey={deletingKey}
        onChange={updateLocal}
        onSave={saveProvider}
        onDelete={deleteProvider}
        addingKind={addingKind}
        draft={draft}
        setAddingKind={setAddingKind}
        setDraft={setDraft}
        onCreate={createProvider}
        creating={savingKey === '__new__'}
      />

      <ProviderSection
        title="AI providers"
        description="AI/voice-model providers, billed per 1,000 tokens, plus tax. Applied against each org's actual Gemini token usage for the current billing period."
        icon={Cpu}
        kind="ai"
        providers={aiProviders}
        savingKey={savingKey}
        savedKey={savedKey}
        deletingKey={deletingKey}
        onChange={updateLocal}
        onSave={saveProvider}
        onDelete={deleteProvider}
        addingKind={addingKind}
        draft={draft}
        setAddingKind={setAddingKind}
        setDraft={setDraft}
        onCreate={createProvider}
        creating={savingKey === '__new__'}
      />

      <section className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <Archive className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-bold text-slate-800">Deleted organizations</h2>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Final cost snapshot taken right before each org was deleted — the org, its call data, and its
          live counters are gone, but the cost/billing record is kept permanently.
        </p>
        {loadingArchive ? (
          <div className="flex items-center justify-center py-10 text-slate-400"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…</div>
        ) : archive.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs">No organizations have been deleted yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-400 uppercase tracking-wide text-[10px]">
                  <th className="py-2 pr-4">Organization</th>
                  <th className="py-2 pr-4">Deleted</th>
                  <th className="py-2 pr-4">AI Minutes</th>
                  <th className="py-2 pr-4">Call Cost</th>
                  <th className="py-2 pr-4">Tokens</th>
                  <th className="py-2 pr-4">Token Cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {archive.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2.5 pr-4">
                      <p className="font-semibold text-slate-700">{row.orgName || row.orgId}</p>
                      <p className="text-[10px] text-slate-400">{row.industry || '—'}</p>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-500">
                      {new Date(row.deletedAt).toLocaleDateString()}
                      {row.deletedByEmail && <p className="text-[10px] text-slate-400">{row.deletedByEmail}</p>}
                    </td>
                    <td className="py-2.5 pr-4 font-mono">{(row.aiMinutesUsed ?? 0).toFixed(2)}</td>
                    <td className="py-2.5 pr-4 font-mono">
                      ₹{(row.phoneCharges ?? 0).toFixed(2)}
                      {row.callProviderLabel && <span className="text-[10px] text-slate-400 ml-1">({row.callProviderLabel})</span>}
                    </td>
                    <td className="py-2.5 pr-4 font-mono">{(row.aiTotalTokens ?? 0).toLocaleString()}</td>
                    <td className="py-2.5 pr-4 font-mono">
                      {row.aiTokenTotalCostInr != null ? `₹${row.aiTokenTotalCostInr.toFixed(2)}` : '—'}
                      {row.aiTokenProviderLabel && <span className="text-[10px] text-slate-400 ml-1">({row.aiTokenProviderLabel})</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function ProviderSection({
  title, description, icon: Icon, kind, providers, savingKey, savedKey, deletingKey,
  onChange, onSave, onDelete, addingKind, draft, setAddingKind, setDraft, onCreate, creating,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  kind: 'call' | 'ai';
  providers: CostProvider[];
  savingKey: string | null;
  savedKey: string | null;
  deletingKey: string | null;
  onChange: (key: string, patch: Partial<CostProvider>) => void;
  onSave: (provider: CostProvider) => void;
  onDelete: (key: string) => void;
  addingKind: 'call' | 'ai' | null;
  draft: ReturnType<typeof emptyDraft> | null;
  setAddingKind: (k: 'call' | 'ai' | null) => void;
  setDraft: (d: ReturnType<typeof emptyDraft> | null) => void;
  onCreate: () => void;
  creating: boolean;
}) {
  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-6">
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-amber-500" />
          <h2 className="text-sm font-bold text-slate-800">{title}</h2>
        </div>
        {addingKind !== kind && (
          <button
            type="button"
            onClick={() => { setAddingKind(kind); setDraft(emptyDraft(kind)); }}
            className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg"
          >
            <Plus className="h-3.5 w-3.5" /> Add provider
          </button>
        )}
      </div>
      <p className="text-xs text-slate-500 mb-4">{description}</p>

      <div className="divide-y divide-slate-100">
        {providers.map((p) => (
          <div key={p.key} className="py-4 flex items-end gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800">{p.label}</p>
              <p className="text-[10px] text-slate-400 font-mono">{p.key}</p>
            </div>

            {kind === 'call' ? (
              <>
                <Field label="Rate (INR)">
                  <input
                    type="number" min="0" step="0.01"
                    value={p.rateAmount ?? 0}
                    onChange={(e) => onChange(p.key, { rateAmount: Number(e.target.value) })}
                    className="w-28 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </Field>
                <Field label="Per">
                  <select
                    value={p.rateUnit ?? 'minute'}
                    onChange={(e) => onChange(p.key, { rateUnit: e.target.value as 'minute' | 'hour' })}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="minute">Minute</option>
                    <option value="hour">Hour</option>
                  </select>
                </Field>
              </>
            ) : (
              <Field label="Rate per 1k tokens (INR)">
                <input
                  type="number" min="0" step="0.01"
                  value={p.ratePer1kTokens ?? 0}
                  onChange={(e) => onChange(p.key, { ratePer1kTokens: Number(e.target.value) })}
                  className="w-32 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </Field>
            )}

            <Field label="Tax %">
              <input
                type="number" min="0" max="100" step="0.01"
                value={p.taxPercent ?? 0}
                onChange={(e) => onChange(p.key, { taxPercent: Number(e.target.value) })}
                className="w-20 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </Field>

            <Field label="Active">
              <select
                value={p.active ? '1' : '0'}
                onChange={(e) => onChange(p.key, { active: e.target.value === '1' })}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </Field>

            <div className="flex items-center gap-2 ml-auto">
              {savedKey === p.key && <span className="text-xs text-emerald-600 font-medium">Saved</span>}
              <button
                type="button"
                onClick={() => onSave(p)}
                disabled={savingKey === p.key}
                className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-medium px-3 py-2 rounded-xl hover:bg-slate-800 disabled:opacity-50"
              >
                {savingKey === p.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save
              </button>
              <button
                type="button"
                onClick={() => onDelete(p.key)}
                disabled={deletingKey === p.key}
                className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50"
                aria-label={`Remove ${p.label}`}
              >
                {deletingKey === p.key ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>
        ))}

        {providers.length === 0 && addingKind !== kind && (
          <div className="py-8 text-center text-slate-400 text-xs">No {kind === 'call' ? 'call' : 'AI'} providers configured yet.</div>
        )}

        {addingKind === kind && draft && (
          <div className="py-4 flex items-end gap-3 flex-wrap bg-amber-50/40 -mx-6 px-6">
            <Field label="Name">
              <input
                type="text" placeholder={kind === 'call' ? 'e.g. Exotel' : 'e.g. OpenAI'}
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                className="w-40 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </Field>
            {kind === 'call' ? (
              <>
                <Field label="Rate (INR)">
                  <input
                    type="number" min="0" step="0.01"
                    value={draft.rateAmount ?? 0}
                    onChange={(e) => setDraft({ ...draft, rateAmount: Number(e.target.value) })}
                    className="w-28 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </Field>
                <Field label="Per">
                  <select
                    value={draft.rateUnit ?? 'minute'}
                    onChange={(e) => setDraft({ ...draft, rateUnit: e.target.value as 'minute' | 'hour' })}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="minute">Minute</option>
                    <option value="hour">Hour</option>
                  </select>
                </Field>
              </>
            ) : (
              <Field label="Rate per 1k tokens (INR)">
                <input
                  type="number" min="0" step="0.01"
                  value={draft.ratePer1kTokens ?? 0}
                  onChange={(e) => setDraft({ ...draft, ratePer1kTokens: Number(e.target.value) })}
                  className="w-32 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </Field>
            )}
            <Field label="Tax %">
              <input
                type="number" min="0" max="100" step="0.01"
                value={draft.taxPercent}
                onChange={(e) => setDraft({ ...draft, taxPercent: Number(e.target.value) })}
                className="w-20 bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </Field>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={() => { setAddingKind(null); setDraft(null); }}
                className="text-xs font-medium text-slate-500 px-3 py-2 rounded-xl hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onCreate}
                disabled={creating || !draft.label.trim()}
                className="flex items-center gap-1.5 bg-slate-900 text-white text-xs font-medium px-3 py-2 rounded-xl hover:bg-slate-800 disabled:opacity-50"
              >
                {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Create
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">{label}</label>
      {children}
    </div>
  );
}
