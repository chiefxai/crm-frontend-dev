import React from 'react';
import { Phone, Mail, Tag, FileText, Calendar } from 'lucide-react';
import { Lead, PipelineStageLabel } from '../../types';
import { formatPhone } from '../../lib/phone';
import { stageLabel } from '../../lib/pipelineStages';
import SlideOver from './SlideOver';
import Badge from './Badge';

const STAGE_COLOR: Record<string, 'blue' | 'amber' | 'green' | 'slate' | 'indigo'> = {
  contact: 'slate', campaign: 'blue', lead: 'indigo', opportunity: 'amber', client: 'green',
};

interface ContactDetailsSlideOverProps {
  lead: Lead | null;
  onClose: () => void;
  stages: PipelineStageLabel[];
  /** Page-specific action buttons (e.g. "Advance to Opportunity") rendered below the details. */
  actions?: React.ReactNode;
}

// Common right-sidebar contact detail view — shared by LeadsView and
// PipelineView (and anywhere else that needs "click a row, see the full
// contact" without duplicating this panel). Read-only: editing a contact
// stays in Contact Directory, which already owns that flow.
export default function ContactDetailsSlideOver({ lead, onClose, stages, actions }: ContactDetailsSlideOverProps) {
  return (
    <SlideOver
      open={!!lead}
      onClose={onClose}
      title={lead?.name}
      subtitle={lead ? `Contact since ${new Date(lead.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
      maxWidth="max-w-lg"
    >
      {lead && (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Badge color={STAGE_COLOR[lead.pipelineStage || 'contact']}>{stageLabel(stages, lead.pipelineStage)}</Badge>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">{lead.status}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl p-3 border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Phone</p>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700"><Phone className="h-3.5 w-3.5 text-slate-400" /> {formatPhone(lead.phone) || lead.phone}</p>
            </div>
            <div className="rounded-xl p-3 border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Email</p>
              <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 truncate"><Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" /> {lead.email || '—'}</p>
            </div>
            <div className="rounded-xl p-3 border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Source</p>
              <p className="text-sm font-semibold text-slate-700">{lead.source || '—'}</p>
            </div>
            <div className="rounded-xl p-3 border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>AI Score</p>
              <p className="text-sm font-semibold text-slate-700">{lead.score ?? '—'}</p>
            </div>
          </div>

          {lead.amountRequested > 0 && (
            <div className="rounded-xl p-3 border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border)' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Amount Requested</p>
              <p className="text-sm font-semibold text-slate-700">${lead.amountRequested.toLocaleString()}</p>
            </div>
          )}

          {lead.financialInfo && (lead.financialInfo.employer || lead.financialInfo.monthlyIncome > 0) && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-3 border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border)' }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Employer</p>
                <p className="text-sm font-semibold text-slate-700">{lead.financialInfo.employer || '—'}</p>
              </div>
              <div className="rounded-xl p-3 border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border)' }}>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--text-muted)' }}>Monthly Income</p>
                <p className="text-sm font-semibold text-slate-700">${(lead.financialInfo.monthlyIncome || 0).toLocaleString()}</p>
              </div>
            </div>
          )}

          {lead.tags?.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <Tag className="h-3 w-3" /> Tags
              </p>
              <div className="flex flex-wrap gap-1.5">
                {lead.tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 text-[10px] bg-indigo-50 border border-indigo-200 rounded text-indigo-600 font-medium">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {lead.notes && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <FileText className="h-3 w-3" /> Notes
              </p>
              <p className="text-sm text-slate-600 whitespace-pre-wrap rounded-xl p-3 border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border)' }}>{lead.notes}</p>
            </div>
          )}

          <p className="text-[10px] flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
            <Calendar className="h-3 w-3" /> Added {new Date(lead.createdAt).toLocaleString()}
          </p>

          {actions && <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>{actions}</div>}
        </div>
      )}
    </SlideOver>
  );
}
