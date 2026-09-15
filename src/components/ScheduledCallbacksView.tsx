import React, { useEffect, useState } from 'react';
import { Clock, Loader2, Phone, MessageCircleQuestion, GitBranch, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { formatPhone } from '../lib/phone';
import PageShell from './ui/PageShell';
import Widget from './ui/Widget';
import EmptyState from './ui/EmptyState';
import DataTable, { Column } from './ui/DataTable';

interface ScheduledCallback {
  id: string;
  leadName: string;
  callerNumber?: string;
  direction?: 'inbound' | 'outbound';
  callbackTime?: string;
  callbackReason?: string;
  nextRetryAt?: string;
  createdAt: string;
  workflowName?: string | null;
  workflowQuestions?: string[];
}

export default function ScheduledCallbacksView() {
  const [rows, setRows] = useState<ScheduledCallback[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    apiFetch('/api/scheduled-callbacks')
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => null);
          console.error('Failed to load scheduled callbacks:', body?.error || r.status);
          return [];
        }
        return r.json();
      })
      .then((result: ScheduledCallback[] | null) => setRows(Array.isArray(result) ? result : []))
      .catch((err) => console.error('Failed to load scheduled callbacks:', err))
      .finally(() => { if (showSpinner) setLoading(false); });
  };

  // No live push for this yet (unlike the dialer queue's SSE feed) — a
  // call landing in "Callback Scheduled" or an automatic redial clearing
  // one out both only show up on the next load, so poll modestly instead
  // of leaving the page to go stale until manually refreshed.
  useEffect(() => {
    load(true);
    const interval = setInterval(() => load(false), 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <PageShell
      title="Scheduled Callbacks"
      subtitle="Calls where the caller said they were busy and asked to be called back — automatically redialed at the time shown."
      onRefresh={() => load()}
      layout="fill"
    >
      <div className="flex-1 flex flex-col overflow-hidden px-8 pb-8 pt-6">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>
        ) : (
          <Widget className="flex-1" showHeader={false} padding="none">
            {rows.length === 0
              ? <EmptyState icon={Clock} heading="No callbacks scheduled" message="When a caller says they're busy and asks to be called back, it'll show up here with the time and reason." />
              : (() => {
                  const columns: Column<ScheduledCallback>[] = [
                    {
                      key: 'who',
                      header: 'Who',
                      cell: (r) => (
                        <div>
                          <div className="font-medium text-slate-700 flex items-center gap-1.5">
                            {r.direction === 'inbound' ? <ArrowDownLeft className="h-3 w-3 text-blue-500" /> : <ArrowUpRight className="h-3 w-3 text-emerald-500" />}
                            {r.leadName || 'Unknown'}
                          </div>
                          {r.callerNumber && (
                            <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-400">
                              <Phone className="h-3 w-3" /> {formatPhone(r.callerNumber)}
                            </div>
                          )}
                        </div>
                      ),
                    },
                    {
                      key: 'reason',
                      header: 'Reason',
                      cell: (r) => r.callbackReason
                        ? <span className="text-slate-600 max-w-sm block italic">"{r.callbackReason}"</span>
                        : <span className="text-slate-300 italic">Not specified</span>,
                    },
                    {
                      key: 'when',
                      header: 'Callback Time',
                      cell: (r) => (
                        <div>
                          <div className="text-slate-700 font-medium whitespace-nowrap">
                            {r.callbackTime
                              ? new Date(r.callbackTime).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                              : 'Not specified'}
                          </div>
                          {r.nextRetryAt && (
                            <div className="text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">
                              Next attempt: {new Date(r.nextRetryAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                            </div>
                          )}
                        </div>
                      ),
                    },
                    {
                      key: 'workflow',
                      header: 'Workflow',
                      cell: (r) => r.workflowName
                        ? (
                          <button
                            onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline cursor-pointer"
                          >
                            <GitBranch className="h-3 w-3" /> {r.workflowName}
                          </button>
                        )
                        : <span className="text-slate-300 italic text-xs">No workflow (inbound)</span>,
                    },
                    {
                      key: 'scheduled',
                      header: 'Scheduled On',
                      cell: (r) => <span className="text-slate-400 text-xs whitespace-nowrap">{new Date(r.createdAt).toLocaleString()}</span>,
                    },
                  ];
                  return (
                    <>
                      <DataTable
                        bare
                        resizable
                        paginated
                        columns={columns}
                        rows={rows}
                        rowKey={(r) => r.id}
                      />
                      {expandedId && (() => {
                        const row = rows.find((r) => r.id === expandedId);
                        if (!row || !row.workflowQuestions?.length) return null;
                        return (
                          <div className="border-t border-slate-100 p-4 bg-slate-50/60">
                            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                              <MessageCircleQuestion className="h-3.5 w-3.5" /> {row.workflowName} — Questions
                            </div>
                            <ol className="space-y-1 text-xs text-slate-600 list-decimal list-inside">
                              {row.workflowQuestions.map((q, i) => <li key={i}>{q}</li>)}
                            </ol>
                          </div>
                        );
                      })()}
                    </>
                  );
                })()
            }
          </Widget>
        )}
      </div>
    </PageShell>
  );
}
