import React, { useEffect, useState } from 'react';
import { X, Loader2, Building2, Users, PhoneCall, ScrollText } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { OrgDetail } from './types';

export default function OrgDetailPanel({ orgId, onClose }: { orgId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<OrgDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/api/platform/organizations/${orgId}`)
      .then((r) => r.json())
      .then(setDetail)
      .finally(() => setLoading(false));
  }, [orgId]);

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-end z-50" onClick={onClose}>
      <div className="w-full max-w-2xl bg-slate-50 h-full overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {loading || !detail ? (
          <div className="flex items-center justify-center h-full text-slate-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>
        ) : (
          <>
            <div className="bg-white border-b border-slate-200 p-6 sticky top-0 z-10 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{detail.name}</h2>
                <p className="text-xs text-slate-400 font-mono mt-1">{detail.workspaceName} · {detail.industry}</p>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="h-5 w-5" /></button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                  <div className="text-lg font-semibold text-slate-800">{detail.counts.members}</div>
                  <div className="text-[10px] text-slate-400 uppercase">Members</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                  <div className="text-lg font-semibold text-slate-800">{detail.counts.leads}</div>
                  <div className="text-[10px] text-slate-400 uppercase">Leads</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                  <div className="text-lg font-semibold text-slate-800">{detail.counts.workflows}</div>
                  <div className="text-[10px] text-slate-400 uppercase">Workflows</div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                  <div className="text-lg font-semibold text-slate-800">{detail.counts.campaigns}</div>
                  <div className="text-[10px] text-slate-400 uppercase">Campaigns</div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">Plan & Usage</h4>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-slate-500">Plan</span>
                  <span className="font-semibold text-slate-800">{detail.subscriptionPlan}</span>
                </div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-slate-500">AI minutes</span>
                  <span className="font-semibold text-slate-800">{detail.aiMinutesUsed} / {detail.aiMinutesLimit}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Signed up</span>
                  <span className="text-slate-600">{new Date(detail.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Team</h4>
                <div className="space-y-2">
                  {detail.members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium text-slate-700">{m.name}</span>
                        <span className="text-slate-400 ml-2 text-xs">{m.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {!m.hasAccount && <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">invited</span>}
                        <span className="text-xs text-slate-500">{m.role}</span>
                      </div>
                    </div>
                  ))}
                  {detail.members.length === 0 && <p className="text-xs text-slate-400">No team members.</p>}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5"><PhoneCall className="h-3.5 w-3.5" /> Recent Calls</h4>
                <div className="space-y-2">
                  {detail.recentCalls.map((c) => (
                    <div key={c.id} className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">{c.callerNumber || 'Unknown'} · {c.agentName}</span>
                      <span className="text-slate-400">{c.durationSeconds}s · {new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                  {detail.recentCalls.length === 0 && <p className="text-xs text-slate-400">No calls yet.</p>}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5"><ScrollText className="h-3.5 w-3.5" /> Recent Activity</h4>
                <div className="space-y-2">
                  {detail.recentActivity.map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">{a.action}</span>
                      <span className="text-slate-400">{new Date(a.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                  {detail.recentActivity.length === 0 && <p className="text-xs text-slate-400">No activity yet.</p>}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
