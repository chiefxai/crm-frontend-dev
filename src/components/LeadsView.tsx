import React from 'react';
import { UserPlus, Phone, ArrowRightCircle, CheckCircle2 } from 'lucide-react';
import { Lead } from '../types';
import { formatPhone } from '../lib/phone';
import { usePipelineStages, stageLabel } from '../lib/pipelineStages';
import PageShell from './ui/PageShell';
import Widget from './ui/Widget';
import Badge from './ui/Badge';
import EmptyState from './ui/EmptyState';
import DataTable, { Column } from './ui/DataTable';
import FilterBar from './ui/FilterBar';
import ContactDetailsSlideOver from './ui/ContactDetailsSlideOver';

// Leads = contacts currently in the "lead" stage of the universal
// contact -> campaign -> lead -> opportunity -> client pipeline (see
// src/lib/pipelineStages.ts) — i.e. contacts who've actually engaged
// (answered a call), past the raw Contact/Campaign stages but not yet a
// qualified Opportunity or a converted Client. A filtered VIEW over the same
// `leads` (Contacts) data App.tsx already manages, not a separate entity —
// advancing a lead here just edits its `status` the same way Contact
// Directory's edit form would, which the backend maps to the next
// pipeline stage (see db.replaceLeads / routes/leads.js PATCH).
const STAGE_COLOR: Record<string, 'blue' | 'amber' | 'green' | 'rose' | 'slate' | 'indigo'> = {
  contact: 'slate',
  campaign: 'blue',
  lead: 'indigo',
  opportunity: 'amber',
  client: 'green',
};

// Minimal shape of a dialer task ("campaign") needed here — just enough
// to list campaigns and check which leads were part of one. Matches the
// DialTask shape defined locally in DialerSimulator.tsx/ReportsView.tsx.
interface CampaignTask {
  id: string;
  name: string;
  leadIds: string[];
  createdAt: string;
}

interface LeadsViewProps {
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  dialerTasks?: CampaignTask[];
}

export default function LeadsView({ leads, setLeads, dialerTasks = [] }: LeadsViewProps) {
  const { stages } = usePipelineStages();
  const [advancingId, setAdvancingId] = React.useState<string | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [sourceFilter, setSourceFilter] = React.useState('All');
  const [campaignFilter, setCampaignFilter] = React.useState('All');
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null);

  const activeLeads = leads.filter((l) => l.pipelineStage === 'lead');
  const uniqueSources = [...new Set(activeLeads.map((l) => l.source).filter(Boolean))].sort();
  const campaignOptions = [...dialerTasks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const selectedCampaign = campaignOptions.find((t) => t.id === campaignFilter) || null;
  const filteredLeads = activeLeads.filter((l) => {
    const matchesSearch = !searchTerm ||
      l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.phone.includes(searchTerm) ||
      (l.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSource = sourceFilter === 'All' || l.source === sourceFilter;
    const matchesCampaign = !selectedCampaign || selectedCampaign.leadIds.includes(l.id);
    return matchesSearch && matchesSource && matchesCampaign;
  });

  // Advances a lead's `status` the same way an edit in Contact Directory
  // would — just local state, same as every other Contact edit in this
  // app. App.tsx's existing debounced sync (or, for a lending-object org,
  // its per-record PATCH effect) picks up the change and persists it; the
  // backend independently derives the matching pipelineStage from the new
  // status (Qualified -> opportunity, Converted -> client), but it's set
  // here too so the row moves off this filtered list immediately instead
  // of waiting on a resync to reflect what the backend is about to do.
  const advance = (lead: Lead, toStatus: Lead['status'], toStage: Lead['pipelineStage']) => {
    setAdvancingId(lead.id);
    setLeads(leads.map((l) => (l.id === lead.id ? { ...l, status: toStatus, pipelineStage: toStage } : l)));
    setSelectedLead(null); // the row is about to leave this filtered list
    setTimeout(() => setAdvancingId(null), 400);
  };

  const columns: Column<Lead>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (l) => (
        <div>
          <p className="font-semibold text-slate-800 dark:text-[var(--text-primary)]">{l.name}</p>
          <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-400 dark:text-[var(--text-muted)]">
            <Phone className="h-3 w-3" /> {formatPhone(l.phone) || l.phone}
          </div>
        </div>
      ),
    },
    { key: 'source', header: 'Source', cell: (l) => <span className="text-xs text-slate-500 dark:text-[var(--text-secondary)]">{l.source}</span> },
    {
      key: 'stage',
      header: 'Stage',
      cell: (l) => <Badge color={STAGE_COLOR[l.pipelineStage || 'contact']}>{stageLabel(stages, l.pipelineStage)}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      cell: (l) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => advance(l, 'Qualified', 'opportunity')}
            disabled={advancingId === l.id}
            className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 hover:text-amber-700 disabled:opacity-50 px-2 py-1 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-500/10 cursor-pointer"
            title={`Advance to ${stageLabel(stages, 'opportunity')}`}
          >
            <ArrowRightCircle className="h-3.5 w-3.5" /> {stageLabel(stages, 'opportunity')}
          </button>
          <button
            onClick={() => advance(l, 'Converted', 'client')}
            disabled={advancingId === l.id}
            className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 disabled:opacity-50 px-2 py-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10 cursor-pointer"
            title={`Mark as ${stageLabel(stages, 'client')}`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> {stageLabel(stages, 'client')}
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageShell
      title="Leads"
      subtitle={`Contacts currently in the ${stageLabel(stages, 'lead')} stage — advance one to ${stageLabel(stages, 'opportunity')} or ${stageLabel(stages, 'client')} as it moves forward.`}
      layout="fill"
    >
      <div className="flex-1 flex flex-col overflow-hidden px-8 pb-8 pt-6 gap-6">
        <Widget showHeader={false} padding="md">
          <FilterBar
            search={{ value: searchTerm, onChange: setSearchTerm, placeholder: 'Search leads by name, phone, or email…' }}
            selects={[
              {
                key: 'source',
                label: 'Source',
                value: sourceFilter,
                onChange: setSourceFilter,
                options: [{ label: 'All Sources', value: 'All' }, ...uniqueSources.map((src) => ({ label: src, value: src }))],
              },
              {
                key: 'campaign',
                label: 'Campaign',
                value: campaignFilter,
                onChange: setCampaignFilter,
                options: [{ label: 'All Campaigns', value: 'All' }, ...campaignOptions.map((t) => ({ label: t.name, value: t.id }))],
              },
            ]}
            actions={
              <div className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-500 whitespace-nowrap">
                <UserPlus className="h-3.5 w-3.5 text-blue-600" />
                {filteredLeads.length} Lead{filteredLeads.length === 1 ? '' : 's'}
              </div>
            }
          />
        </Widget>
        <Widget className="flex-1" showHeader title="Leads" icon={UserPlus} accent="#2563eb" padding="none">
          {activeLeads.length === 0 ? (
            <EmptyState
              icon={UserPlus}
              heading="No active leads right now"
              message="Contacts show up here once a call to them is actually answered and engaged with — track new prospects from Contact Directory first."
            />
          ) : filteredLeads.length === 0 ? (
            <EmptyState icon={UserPlus} heading="No leads match your search" />
          ) : (
            <DataTable bare resizable paginated columns={columns} rows={filteredLeads} rowKey={(l) => l.id} onRowClick={setSelectedLead} />
          )}
        </Widget>
      </div>

      <ContactDetailsSlideOver
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        stages={stages}
        actions={selectedLead && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => advance(selectedLead, 'Qualified', 'opportunity')}
              disabled={advancingId === selectedLead.id}
              className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 disabled:opacity-50 px-3 py-2 rounded-xl border border-amber-200 hover:bg-amber-50 cursor-pointer"
            >
              <ArrowRightCircle className="h-4 w-4" /> Advance to {stageLabel(stages, 'opportunity')}
            </button>
            <button
              onClick={() => advance(selectedLead, 'Converted', 'client')}
              disabled={advancingId === selectedLead.id}
              className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 disabled:opacity-50 px-3 py-2 rounded-xl border border-emerald-200 hover:bg-emerald-50 cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" /> Mark as {stageLabel(stages, 'client')}
            </button>
          </div>
        )}
      />
    </PageShell>
  );
}
