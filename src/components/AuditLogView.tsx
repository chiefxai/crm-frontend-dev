import React, { useEffect, useState } from 'react';
import { ScrollText, Loader2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import PageHeader from './PageHeader';

interface AuditEntry {
  id: string;
  actorEmail: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

function describeAction(action: string): string {
  const labels: Record<string, string> = {
    'config.update': 'Updated AI persona config',
    'config.apply_preset': 'Applied a persona preset',
    'dnc.add': 'Added a number to the Do-Not-Call list',
    'dnc.remove': 'Removed a number from the Do-Not-Call list',
    'calling_window.update': 'Updated calling window',
    'knowledge.add_document': 'Added a knowledge base document',
    'knowledge.delete_document': 'Deleted a knowledge base document',
    'team.add': 'Added a team member',
    'team.update': 'Updated a team member',
    'org_settings.update': 'Updated organization settings',
    'channel.connect': 'Connected a channel',
    'object.create': 'Created a custom object'
  };
  return labels[action] || action;
}

export default function AuditLogView() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/audit-log')
      .then((r) => r.json())
      .then((list: AuditEntry[]) => setEntries(Array.isArray(list) ? list : []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-full text-slate-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>;
  }

  return (
    <div className="font-sans h-full overflow-y-auto">
      <PageHeader title="Audit Log" subtitle="Admin actions across this organization — who changed what, and when." />

      <div className="px-8 pb-8">
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          {entries.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400 flex flex-col items-center gap-2">
              <ScrollText className="h-8 w-8 text-slate-300" />
              No admin actions recorded yet.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">By</th>
                  <th className="px-5 py-3">Details</th>
                  <th className="px-5 py-3">When</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-5 py-3 font-medium text-slate-700">{describeAction(e.action)}</td>
                    <td className="px-5 py-3 text-slate-500">{e.actorEmail || '—'}</td>
                    <td className="px-5 py-3 text-slate-400 text-xs max-w-xs truncate" title={JSON.stringify(e.metadata)}>
                      {Object.keys(e.metadata || {}).length ? JSON.stringify(e.metadata) : '—'}
                    </td>
                    <td className="px-5 py-3 text-slate-400 text-xs whitespace-nowrap">{new Date(e.createdAt).toLocaleString()}</td>
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
