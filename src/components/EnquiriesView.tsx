import React, { useEffect, useState } from 'react';
import { MessageCircleQuestion, Loader2, Phone, Mail, MapPin, CheckCircle2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import PageHeader from './PageHeader';

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

export default function EnquiriesView() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = () => {
    apiFetch('/api/enquiries')
      .then((r) => r.json())
      .then((list: Enquiry[]) => setEnquiries(Array.isArray(list) ? list : []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleMarkStatus = async (id: string, status: Enquiry['status']) => {
    setUpdatingId(id);
    try {
      const res = await apiFetch(`/api/enquiries/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setEnquiries((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)));
      }
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full text-slate-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>;
  }

  const openCount = enquiries.filter((e) => e.status === 'new').length;

  return (
    <div className="font-sans h-full overflow-y-auto">
      <PageHeader
        title="Enquiries"
        subtitle={`Callers who asked something mid-call and need a follow-up — ${openCount} still open.`}
        action={null}
      />

      <div className="px-8 pb-8">
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          {enquiries.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
              <MessageCircleQuestion className="h-8 w-8 text-slate-300" />
              No enquiries captured yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  <th className="px-5 py-3">Caller</th>
                  <th className="px-5 py-3">Enquiry</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">When</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {enquiries.map((e) => (
                  <tr key={e.id} className="border-b border-slate-50 last:border-0">
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
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                        e.status === 'new'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : e.status === 'contacted'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {e.status}
                      </span>
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
          )}
        </div>
      </div>
    </div>
  );
}
