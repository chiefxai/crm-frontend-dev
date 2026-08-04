import React, { useEffect, useState } from 'react';
import { CreditCard, Loader2, Check } from 'lucide-react';
import { apiFetch } from '../lib/api';
import PageHeader from './PageHeader';

interface BillingInfo {
  plan: string;
  aiMinutesUsed: number;
  aiMinutesLimit: number;
  billingPeriodEnd: string;
  availablePlans: string[];
}

const PLAN_DETAILS: Record<string, { price: string; blurb: string }> = {
  Starter: { price: '$0', blurb: '1,000 AI minutes / month' },
  Growth: { price: '$99', blurb: '5,000 AI minutes / month' },
  Enterprise: { price: 'Custom', blurb: '20,000 AI minutes / month' }
};

export default function BillingView() {
  const [info, setInfo] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState<string | null>(null);

  const load = () => {
    apiFetch('/api/billing')
      .then((r) => r.json())
      .then(setInfo)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleChangePlan = async (plan: string) => {
    if (!info || plan === info.plan) return;
    setChanging(plan);
    const res = await apiFetch('/api/billing/plan', { method: 'POST', body: JSON.stringify({ plan }) });
    setChanging(null);
    if (res.ok) load();
    else alert((await res.json()).error || 'Failed to change plan');
  };

  if (loading || !info) {
    return <div className="flex items-center justify-center h-full text-slate-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>;
  }

  const pct = info.aiMinutesLimit ? Math.min(100, Math.round((info.aiMinutesUsed / info.aiMinutesLimit) * 100)) : 0;
  const barColor = pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="font-sans h-full overflow-y-auto">
      <PageHeader title="Billing & Usage" subtitle="Your plan, AI-minutes usage, and billing period." />

      <div className="px-8 pb-8 space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" /> AI Minutes This Period
            </h4>
            <span className="text-xs text-slate-400">Resets {new Date(info.billingPeriodEnd).toLocaleDateString()}</span>
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-2xl font-bold text-slate-800">{info.aiMinutesUsed}</span>
            <span className="text-sm text-slate-400">/ {info.aiMinutesLimit} minutes</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
          </div>
          {pct >= 100 && (
            <p className="text-xs text-rose-600 mt-2">You've reached your plan's limit — outbound calls are blocked until your next billing period or you upgrade.</p>
          )}
        </div>

        <div>
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Plans</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {info.availablePlans.map((plan) => {
              const isCurrent = plan === info.plan;
              const details = PLAN_DETAILS[plan] || { price: '—', blurb: '' };
              return (
                <div key={plan} className={`bg-white border rounded-2xl p-5 ${isCurrent ? 'border-indigo-400 ring-1 ring-indigo-200' : 'border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <h5 className="font-semibold text-slate-800">{plan}</h5>
                    {isCurrent && <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full"><Check className="h-3 w-3" /> Current</span>}
                  </div>
                  <div className="text-xl font-bold text-slate-800 mb-1">{details.price}<span className="text-xs font-normal text-slate-400">/mo</span></div>
                  <p className="text-xs text-slate-500 mb-4">{details.blurb}</p>
                  <button
                    onClick={() => handleChangePlan(plan)}
                    disabled={isCurrent || changing !== null}
                    className={`w-full text-xs font-semibold py-2 rounded-lg transition-colors ${
                      isCurrent ? 'bg-slate-100 text-slate-400 cursor-default' : 'bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-60'
                    }`}
                  >
                    {changing === plan ? 'Switching…' : isCurrent ? 'Current Plan' : 'Switch to ' + plan}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
