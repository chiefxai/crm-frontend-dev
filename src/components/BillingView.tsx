import React, { useEffect, useState } from 'react';
import { CreditCard, Clock, Loader2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { formatInr } from '../lib/pricing';
import PageShell from './ui/PageShell';
import Widget from './ui/Widget';
import SectionLabel from './ui/SectionLabel';

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
    apiFetch('/api/billing').then(r => r.json()).then(setInfo).finally(() => setLoading(false));
  }, []);

  if (loading || !info) return <div className="flex items-center justify-center h-full text-slate-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>;

  return (
    <PageShell title="Billing & Usage" subtitle="AI-minutes usage and current billing period summary.">
      {/* Minutes used */}
      <Widget colSpan={6} title="AI Minutes This Period" subtitle={`Period resets ${new Date(info.billingPeriodEnd).toLocaleDateString()}`} icon={Clock} accent="#2563eb" padding="md">
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-3xl font-bold text-slate-800 dark:text-[var(--text-primary)]">{info.aiMinutesUsed.toFixed(2)}</span>
          <span className="text-sm text-slate-400">minutes used</span>
        </div>
      </Widget>

      {/* Total cost */}
      <Widget colSpan={6} title="Total Cost" subtitle={`Billed at ₹${info.costPerMinuteInr} per minute`} icon={CreditCard} accent="#7c3aed" padding="md">
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-3xl font-bold text-slate-800 dark:text-[var(--text-primary)]">{formatInr(info.totalCostInr)}</span>
          <span className="text-sm text-slate-400">this period</span>
        </div>
      </Widget>
    </PageShell>
  );
}
