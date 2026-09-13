import React, { useEffect, useState } from 'react';
import { MessageCircleQuestion, Loader2, Phone, Mail, MapPin, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import PageShell from './ui/PageShell';
import Widget from './ui/Widget';
import Badge from './ui/Badge';
import EmptyState from './ui/EmptyState';
import DataTable, { Column } from './ui/DataTable';

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

  const load = (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    apiFetch('/api/enquiries')
      .then(r => r.ok ? r.json() : [])
      .then((list: Enquiry[]) => setEnquiries(Array.isArray(list) ? list : []))
      .catch(() => [])
      .finally(() => { if (showSpinner) setLoading(false); });
  };

  useEffect(() => { load(true); }, []);

  const handleMarkStatus = async (id: string, status: Enquiry['status']) => {
    setUpdatingId(id);
    try {
      const res = await apiFetch(`/api/enquiries/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      if (res.ok) setEnquiries(prev => prev.map(e => e.id === id ? { ...e, status } : e));
    } finally { setUpdatingId(null); }
  };

  const openCount = enquiries.filter(e => e.status === 'new').length;

  return (
    <PageShell title="Enquiries" subtitle={`Callers who asked something mid-call and need a follow-up — ${openCount} still open.`} onRefresh={() => load()} layout="fill">
      <div className="flex-1 flex flex-col overflow-hidden px-8 pb-8 pt-6">
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>
      ) : (
      <Widget className="flex-1" title="Open Enquiries" subtitle="Click an action to update the status of each enquiry." icon={MessageCircleQuestion} accent="#f59e0b" padding="none" scrollable maxBodyHeight="100%">
        {enquiries.length === 0
          ? <EmptyState icon={MessageCircleQuestion} heading="No enquiries captured yet" message="Enquiries from AI calls will appear here automatically." />
          : (() => {
              const columns: Column<Enquiry>[] = [
                {
                  key: 'caller',
                  header: 'Caller',
                  cell: (e) => (
                    <>
                      <div className="font-medium text-slate-700">{e.name || 'Unknown caller'}</div>
                      <div className="flex flex-col gap-0.5 mt-1 text-xs text-slate-400">
                        {e.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {e.phone}</span>}
                        {e.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {e.email}</span>}
                        {e.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {e.location}</span>}
                      </div>
                    </>
                  ),
                },
                { key: 'enquiry', header: 'Enquiry', cell: (e) => <span className="text-slate-600 max-w-sm">{e.queryText}</span> },
                { key: 'status', header: 'Status', cell: (e) => <Badge color={STATUS_COLOR[e.status]}>{e.status}</Badge> },
                { key: 'when', header: 'When', cell: (e) => <span className="text-slate-400 text-xs whitespace-nowrap">{new Date(e.createdAt).toLocaleString()}</span> },
                {
                  key: 'action',
                  header: 'Action',
                  align: 'right',
                  cell: (e) => e.status !== 'resolved' ? (
                    <button
                      disabled={updatingId === e.id}
                      onClick={() => handleMarkStatus(e.id, e.status === 'new' ? 'contacted' : 'resolved')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {e.status === 'new' ? 'Mark Contacted' : 'Mark Resolved'}
                    </button>
                  ) : null,
                },
              ];
              return <DataTable bare resizable paginated columns={columns} rows={enquiries} rowKey={(e) => e.id} />;
            })()
        }
      </Widget>
      )}
      </div>
    </PageShell>
  );
}
