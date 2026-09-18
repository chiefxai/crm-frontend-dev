import React, { useEffect, useState } from 'react';
import { Loader2, Save, Phone, Cpu, Archive } from 'lucide-react';
import { apiFetch } from '../lib/api';
import Widget from '../components/ui/Widget';

// Every provider's identity (key/kind/label) is defined in code — see the
// backend's platform/costProviders.js KNOWN_PROVIDERS. This page can only
// adjust an existing provider's rate/tax/active state, never add or
// remove one: support for a new provider (Twilio, etc.) is a code
// change, and it then just shows up here with a zero rate to fill in.
type CostProvider = {
  key: string;
  kind: 'call' | 'ai';
  label: string;
  active: boolean;
  taxPercent: number;
  // call kind
  rateUnit?: 'minute' | 'hour';
  rateAmount?: number;
  // ai kind — ratePer1kTokens is "the rate, quoted per tokenUnit tokens"
  // (name kept for backward compat; tokenUnit itself is configurable now,
  // not fixed at 1,000).
  ratePer1kTokens?: number;
  tokenUnit?: number;
  updatedAt?: string;
};

const TOKEN_UNIT_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: 'token' },
  { value: 100, label: '100 tokens' },
  { value: 1000, label: '1,000 tokens' },
  { value: 1000000, label: '1,000,000 tokens' },
];

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

export default function CostPage() {
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<CostProvider[]>([]);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
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

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>;
  }

  const activeCallProviderCount = callProviders.filter((p) => p.active).length;
  const activeAiProviderCount = aiProviders.filter((p) => p.active).length;

  return (
    <div className="grid grid-cols-12 gap-4">
      {error && (
        <div className="col-span-12 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-xl px-4 py-3">{error}</div>
      )}

      <Widget colSpan={3} icon={Phone} accent="#0d9488" padding="md">
        <span className="text-xs font-medium text-slate-500 dark:text-[var(--text-secondary)]">Active call providers</span>
        <div className="text-2xl font-semibold text-slate-900 dark:text-[var(--text-primary)] mt-1">{activeCallProviderCount}</div>
      </Widget>
      <Widget colSpan={3} icon={Cpu} accent="#4a3aa7" padding="md">
        <span className="text-xs font-medium text-slate-500 dark:text-[var(--text-secondary)]">Active AI providers</span>
        <div className="text-2xl font-semibold text-slate-900 dark:text-[var(--text-primary)] mt-1">{activeAiProviderCount}</div>
      </Widget>
      <Widget colSpan={3} icon={Archive} accent="#b45309" padding="md">
        <span className="text-xs font-medium text-slate-500 dark:text-[var(--text-secondary)]">Deleted orgs archived</span>
        <div className="text-2xl font-semibold text-slate-900 dark:text-[var(--text-primary)] mt-1">{archive.length}</div>
      </Widget>

      <ProviderSection
        title="Call providers"
        description="Telephony providers this codebase integrates with, billed per minute or per hour, plus tax. Support for a new provider is added in code — it then appears here automatically. This rate flows into every org's Billing & Usage as soon as it's set — no redeploy needed."
        icon={Phone}
        kind="call"
        providers={callProviders}
        savingKey={savingKey}
        savedKey={savedKey}
        onChange={updateLocal}
        onSave={saveProvider}
      />

      <ProviderSection
        title="AI providers"
        description="AI-model providers this codebase integrates with, billed per token/100/1,000/1,000,000, plus tax. Live-voice and post-call-agent usage are priced separately since they're different models — applied against each org's actual Gemini token usage for the current billing period."
        icon={Cpu}
        kind="ai"
        providers={aiProviders}
        savingKey={savingKey}
        savedKey={savedKey}
        onChange={updateLocal}
        onSave={saveProvider}
      />

      <Widget
        colSpan={12}
        title="Deleted organizations"
        subtitle="Final cost snapshot taken right before each org was deleted — the org, its call data, and its live counters are gone, but the cost/billing record is kept permanently."
        icon={Archive}
        accent="#b45309"
        scrollable
        padding="md"
      >
        {loadingArchive ? (
          <div className="flex items-center justify-center py-10 text-slate-400"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…</div>
        ) : archive.length === 0 ? (
          <div className="py-8 text-center text-slate-400 dark:text-[var(--text-muted)] text-xs">No organizations have been deleted yet.</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-slate-400 dark:text-[var(--text-muted)] uppercase tracking-wide text-[10px]">
                <th className="py-2 pr-4">Organization</th>
                <th className="py-2 pr-4">Deleted</th>
                <th className="py-2 pr-4">AI Minutes</th>
                <th className="py-2 pr-4">Call Cost</th>
                <th className="py-2 pr-4">Tokens</th>
                <th className="py-2 pr-4">Token Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[var(--border)]">
              {archive.map((row) => (
                <tr key={row.id}>
                  <td className="py-2.5 pr-4">
                    <p className="font-semibold text-slate-700 dark:text-[var(--text-primary)]">{row.orgName || row.orgId}</p>
                    <p className="text-[10px] text-slate-400 dark:text-[var(--text-muted)]">{row.industry || '—'}</p>
                  </td>
                  <td className="py-2.5 pr-4 text-slate-500 dark:text-[var(--text-secondary)]">
                    {new Date(row.deletedAt).toLocaleDateString()}
                    {row.deletedByEmail && <p className="text-[10px] text-slate-400 dark:text-[var(--text-muted)]">{row.deletedByEmail}</p>}
                  </td>
                  <td className="py-2.5 pr-4 font-mono">{(row.aiMinutesUsed ?? 0).toFixed(2)}</td>
                  <td className="py-2.5 pr-4 font-mono">
                    ₹{(row.phoneCharges ?? 0).toFixed(2)}
                    {row.callProviderLabel && <span className="text-[10px] text-slate-400 dark:text-[var(--text-muted)] ml-1">({row.callProviderLabel})</span>}
                  </td>
                  <td className="py-2.5 pr-4 font-mono">{(row.aiTotalTokens ?? 0).toLocaleString()}</td>
                  <td className="py-2.5 pr-4 font-mono">
                    {row.aiTokenTotalCostInr != null ? `₹${row.aiTokenTotalCostInr.toFixed(2)}` : '—'}
                    {row.aiTokenProviderLabel && <span className="text-[10px] text-slate-400 dark:text-[var(--text-muted)] ml-1">({row.aiTokenProviderLabel})</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Widget>
    </div>
  );
}

function ProviderSection({
  title, description, icon: Icon, kind, providers, savingKey, savedKey, onChange, onSave,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  kind: 'call' | 'ai';
  providers: CostProvider[];
  savingKey: string | null;
  savedKey: string | null;
  onChange: (key: string, patch: Partial<CostProvider>) => void;
  onSave: (provider: CostProvider) => void;
}) {
  return (
    <Widget colSpan={12} title={title} subtitle={description} icon={Icon} accent="#f59e0b" padding="md">
      <div className="divide-y divide-slate-100 dark:divide-[var(--border)]">
        {providers.map((p) => (
          <div key={p.key} className="py-4 flex items-end gap-3 flex-wrap">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-[var(--text-primary)]">{p.label}</p>
              <p className="text-[10px] text-slate-400 dark:text-[var(--text-muted)] font-mono">{p.key}</p>
            </div>

            {kind === 'call' ? (
              <>
                <Field label="Rate (INR)">
                  <input
                    type="number" min="0" step="0.01"
                    value={p.rateAmount ?? 0}
                    onChange={(e) => onChange(p.key, { rateAmount: Number(e.target.value) })}
                    className="w-28 bg-slate-50 dark:bg-[var(--bg-subtle)] border border-slate-200 dark:border-[var(--border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </Field>
                <Field label="Per">
                  <select
                    value={p.rateUnit ?? 'minute'}
                    onChange={(e) => onChange(p.key, { rateUnit: e.target.value as 'minute' | 'hour' })}
                    className="bg-slate-50 dark:bg-[var(--bg-subtle)] border border-slate-200 dark:border-[var(--border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="minute">Minute</option>
                    <option value="hour">Hour</option>
                  </select>
                </Field>
              </>
            ) : (
              <>
                <Field label="Rate (INR)">
                  <input
                    type="number" min="0" step="0.0001"
                    value={p.ratePer1kTokens ?? 0}
                    onChange={(e) => onChange(p.key, { ratePer1kTokens: Number(e.target.value) })}
                    className="w-28 bg-slate-50 dark:bg-[var(--bg-subtle)] border border-slate-200 dark:border-[var(--border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </Field>
                <Field label="Per">
                  <select
                    value={p.tokenUnit ?? 1000}
                    onChange={(e) => onChange(p.key, { tokenUnit: Number(e.target.value) })}
                    className="bg-slate-50 dark:bg-[var(--bg-subtle)] border border-slate-200 dark:border-[var(--border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    {TOKEN_UNIT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
              </>
            )}

            <Field label="Tax %">
              <input
                type="number" min="0" max="100" step="0.01"
                value={p.taxPercent ?? 0}
                onChange={(e) => onChange(p.key, { taxPercent: Number(e.target.value) })}
                className="w-20 bg-slate-50 dark:bg-[var(--bg-subtle)] border border-slate-200 dark:border-[var(--border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </Field>

            <Field label="Active">
              <select
                value={p.active ? '1' : '0'}
                onChange={(e) => onChange(p.key, { active: e.target.value === '1' })}
                className="bg-slate-50 dark:bg-[var(--bg-subtle)] border border-slate-200 dark:border-[var(--border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
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
            </div>
          </div>
        ))}

        {providers.length === 0 && (
          <div className="py-8 text-center text-slate-400 dark:text-[var(--text-muted)] text-xs">
            No {kind === 'call' ? 'call' : 'AI'} providers are integrated in code yet.
          </div>
        )}
      </div>
    </Widget>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-slate-400 dark:text-[var(--text-muted)] uppercase tracking-wide mb-1">{label}</label>
      {children}
    </div>
  );
}
