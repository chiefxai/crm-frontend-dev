import React, { useEffect, useState } from 'react';
import { Loader2, Save, ToggleLeft, ToggleRight, Zap, ListChecks } from 'lucide-react';
import { apiFetch } from '../lib/api';
import Widget from '../components/ui/Widget';

type FeatureFlag = {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
};

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [costPerMinuteInr, setCostPerMinuteInr] = useState('0');
  const [savingPrice, setSavingPrice] = useState(false);
  const [priceSaved, setPriceSaved] = useState(false);
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiFetch('/api/platform/pricing').then((r) => r.json()),
      apiFetch('/api/platform/features').then((r) => r.json())
    ])
      .then(([pricing, features]) => {
        setCostPerMinuteInr(String(pricing.costPerMinuteInr ?? ''));
        setFlags(Array.isArray(features) ? features : []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const savePricing = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrice(true);
    setPriceSaved(false);
    try {
      const res = await apiFetch('/api/platform/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ costPerMinuteInr: Number(costPerMinuteInr) })
      });
      if (res.ok) {
        setPriceSaved(true);
        setTimeout(() => setPriceSaved(false), 2000);
      }
    } finally {
      setSavingPrice(false);
    }
  };

  const toggleFlag = async (flag: FeatureFlag) => {
    setTogglingKey(flag.key);
    const nextEnabled = !flag.enabled;
    setFlags((prev) => prev.map((f) => (f.key === flag.key ? { ...f, enabled: nextEnabled } : f)));
    try {
      const res = await apiFetch(`/api/platform/features/${flag.key}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextEnabled })
      });
      if (!res.ok) {
        // Revert on failure — the toggle didn't actually take effect server-side.
        setFlags((prev) => prev.map((f) => (f.key === flag.key ? { ...f, enabled: flag.enabled } : f)));
      }
    } catch {
      setFlags((prev) => prev.map((f) => (f.key === flag.key ? { ...f, enabled: flag.enabled } : f)));
    } finally {
      setTogglingKey(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>;
  }

  const enabledCount = flags.filter((f) => f.enabled).length;

  return (
    <div className="grid grid-cols-12 gap-4">
      <Widget colSpan={3} icon={Zap} accent="#f59e0b" padding="md">
        <span className="text-xs font-medium text-slate-500 dark:text-[var(--text-secondary)]">Cost per minute</span>
        <div className="text-2xl font-semibold text-slate-900 dark:text-[var(--text-primary)] mt-1">₹{costPerMinuteInr || 0}</div>
      </Widget>
      <Widget colSpan={3} icon={ListChecks} accent="#1baf7a" padding="md">
        <span className="text-xs font-medium text-slate-500 dark:text-[var(--text-secondary)]">Features enabled</span>
        <div className="text-2xl font-semibold text-slate-900 dark:text-[var(--text-primary)] mt-1">{enabledCount} / {flags.length}</div>
      </Widget>

      <Widget
        colSpan={12}
        title="Voice call pricing"
        subtitle="Applies platform-wide to every org's billing calculation immediately — no redeploy needed."
        padding="md"
      >
        <form onSubmit={savePricing} className="flex items-end gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-[var(--text-muted)] uppercase tracking-wide mb-1">
              Cost per minute (INR)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={costPerMinuteInr}
              onChange={(e) => setCostPerMinuteInr(e.target.value)}
              className="w-40 bg-slate-50 dark:bg-[var(--bg-subtle)] border border-slate-200 dark:border-[var(--border)] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>
          <button
            type="submit"
            disabled={savingPrice}
            className="flex items-center gap-2 bg-slate-900 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-slate-800 disabled:opacity-50"
          >
            {savingPrice ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
          {priceSaved && <span className="text-xs text-emerald-600 font-medium">Saved</span>}
        </form>
        <p className="text-[10px] text-slate-400 dark:text-[var(--text-muted)] mt-3">
          For per-provider call/AI rates and tax, see the <strong className="font-semibold text-slate-500 dark:text-[var(--text-secondary)]">Cost</strong> page.
        </p>
      </Widget>

      <Widget
        colSpan={12}
        title="Feature flags"
        subtitle="Turning a feature off takes effect on the AI's next call — it stops offering that capability entirely instead of just hiding a button."
        padding="md"
      >
        <div className="divide-y divide-slate-100 dark:divide-[var(--border)]">
          {flags.map((flag) => (
            <div key={flag.key} className="flex items-center justify-between py-3">
              <div className="pr-4">
                <div className="text-sm font-medium text-slate-700 dark:text-[var(--text-primary)]">{flag.label}</div>
                <div className="text-xs text-slate-400 dark:text-[var(--text-muted)] mt-0.5">{flag.description}</div>
              </div>
              <button
                onClick={() => toggleFlag(flag)}
                disabled={togglingKey === flag.key}
                className="shrink-0 disabled:opacity-50"
                aria-label={`Toggle ${flag.label}`}
              >
                {flag.enabled ? (
                  <ToggleRight className="h-8 w-8 text-emerald-500" />
                ) : (
                  <ToggleLeft className="h-8 w-8 text-slate-300" />
                )}
              </button>
            </div>
          ))}
          {flags.length === 0 && <div className="py-8 text-center text-slate-400 dark:text-[var(--text-muted)] text-xs">No feature flags configured.</div>}
        </div>
      </Widget>
    </div>
  );
}
