import React, { useEffect, useState } from 'react';
import { ScrollText, Loader2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import PageShell from './ui/PageShell';
import Widget from './ui/Widget';
import DataTable, { Column } from './ui/DataTable';
import EmptyState from './ui/EmptyState';

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
    'object.create': 'Created a custom object',
  };
  return labels[action] || action;
}

const COLUMNS: Column<AuditEntry>[] = [
  { key: 'action', header: 'Action', cell: r => <span className="font-medium text-slate-700">{describeAction(r.action)}</span> },
  { key: 'by', header: 'By', cell: r => <span className="text-slate-500">{r.actorEmail || '—'}</span> },
  {
    key: 'details', header: 'Details',
    cell: r => (
      <span className="text-slate-400 text-xs truncate block max-w-xs" title={JSON.stringify(r.metadata)}>
        {Object.keys(r.metadata || {}).length ? JSON.stringify(r.metadata) : '—'}
      </span>
    ),
  },
  {
    key: 'when', header: 'When', align: 'right',
    cell: r => <span className="text-slate-400 text-xs whitespace-nowrap">{new Date(r.createdAt).toLocaleString()}</span>,
  },
];

export default function AuditLogView() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEntries = (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    apiFetch('/api/audit-log')
      .then(r => r.json())
      .then((list: AuditEntry[]) => setEntries(Array.isArray(list) ? list : []))
      .finally(() => { if (showSpinner) setLoading(false); });
  };

  useEffect(() => { loadEntries(true); }, []);

  return (
    <PageShell title="Audit Log" subtitle="Admin actions across this organization — who changed what, and when." onRefresh={() => loadEntries()} layout="fill">
      <div className="flex-1 flex flex-col overflow-hidden px-8 pb-8 pt-6">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…</div>
        ) : (
          <Widget className="flex-1" showHeader={false} padding="none">
            {entries.length === 0
              ? <EmptyState icon={ScrollText} heading="No admin actions recorded yet" />
              : <DataTable bare paginated resizable columns={COLUMNS} rows={entries} rowKey={r => r.id} />
            }
          </Widget>
        )}
      </div>
    </PageShell>
  );
}
