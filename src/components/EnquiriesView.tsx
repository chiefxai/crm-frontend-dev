import React, { useEffect, useState } from 'react';
import { MessageCircleQuestion, Loader2, Phone, Mail, MapPin, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import PageShell from './ui/PageShell';
import Widget from './ui/Widget';
import Badge from './ui/Badge';
import EmptyState from './ui/EmptyState';

interface Enquiry {
  id: string;
  callId: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  location: string | null;
  queryText: string;
  assignedTeamMemberId: string | null;
  status: 'new' | 'contacted' | 'resolved';
  createdAt: string;
}

const STATUS_COLOR: Record<string, 'amber' | 'blue' | 'green'> = { new: 'amber', contacted: 'blue', resolved: 'green' };

export default function EnquiriesView() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = () => {
    apiFetch('/api/enquiries')
      .then(r => r.ok ? r.json() : [])
      .then((list: Enquiry[]) => setEnquiries(Array.isArray(list) ? list : []))
      .catch(() => [])
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleMarkStatus = async (id: string, status: Enquiry['status']) => {
    setUpdatingId(id);
    try {
      const res = await apiFetch(`/api/enquiries/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      if (res.ok) setEnquiries(prev => prev.map(e => e.id === id ? { ...e, status } : e));
    } finally { setUpdatingId(null); }
  };

  if (loading) return <div className="flex items-center justify-center h-full text-slate-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>;

  const openCount = enquiries.filter(e => e.status === 'new').length;

  return (
    <PageShell title="Enquiries" subtitle={`Callers who asked something mid-call and need a follow-up — ${openCount} still open.`}>
      <Widget colSpan={12} title="Open Enquiries" subtitle="Click an action to update the status of each enquiry." icon={MessageCircleQuestion} accent="#f59e0b" padding="none" scrollable>
        {enquiries.length === 0
          ? <EmptyState icon={MessageCircleQuestion} heading="No enquiries captured yet" message="Enquiries from AI calls will appear here automatically." />
          : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10" style={{ background: 'var(--bg-surface)' }}>
                <tr className="border-b border-slate-100 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  <th className="px-5 py-3">Caller</th>
                  <th className="px-5 py-3">Enquiry</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">When</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {enquiries.map(e => (
                  <tr key={e.id} className="border-b border-slate-50 last:border-0 hover:bg-[var(--bg-subtle)]">
                    <td className="px-5 py-3">
                      <div className="font-medium text-slate-700">{e.name || 'Unknown caller'}</div>
                      <div className="flex flex-col gap-0.5 mt-1 text-xs text-slate-400">
                        {e.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {e.phone}</span>}
                        {e.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {e.email}</span>}
                        {e.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {e.location}</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-slate-600 max-w-sm">{e.queryText}</td>
                    <td className="px-5 py-3">
                      <Badge color={STATUS_COLOR[e.status]}>{e.status}</Badge>
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-xs whitespace-nowrap">{new Date(e.createdAt).toLocaleString()}</td>
                    <td className="px-5 py-3 text-right">
                      {e.status !== 'resolved' && (
                        <button
                          disabled={updatingId === e.id}
                          onClick={() => handleMarkStatus(e.id, e.status === 'new' ? 'contacted' : 'resolved')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {e.status === 'new' ? 'Mark Contacted' : 'Mark Resolved'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }
      </Widget>
    </PageShell>
  );
}
