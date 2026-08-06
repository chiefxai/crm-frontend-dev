import React, { useEffect, useState } from 'react';
import { CreditCard, Loader2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import PageHeader from './PageHeader';
import { formatInr } from '../lib/pricing';

interface BillingInfo {
  aiMinutesUsed: number;
  billingPeriodEnd: string;
  costPerMinuteInr: number;
  totalCostInr: number;
}

export default function BillingView() {
  const [info, setInfo] = useState<BillingInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/billing')
      .then((r) => r.json())
      .then(setInfo)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !info) {
    return <div className="flex items-center justify-center h-full text-slate-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>;
  }

  return (
    <div className="font-sans h-full overflow-y-auto">
      <PageHeader title="Billing & Usage" subtitle="AI-minutes usage and billing period." />

      <div className="px-8 pb-8 space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" /> AI Minutes This Period
            </h4>
            <span className="text-xs text-slate-400">Resets {new Date(info.billingPeriodEnd).toLocaleDateString()}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800">{info.aiMinutesUsed}</span>
            <span className="text-sm text-slate-400">minutes used</span>
          </div>
          <div className="flex items-baseline gap-2 mt-3 pt-3 border-t border-slate-100">
            <span className="text-2xl font-bold text-slate-800">{formatInr(info.totalCostInr)}</span>
            <span className="text-sm text-slate-400">at ₹{info.costPerMinuteInr}/min</span>
          </div>
        </div>
      </div>
    </div>
  );
}
