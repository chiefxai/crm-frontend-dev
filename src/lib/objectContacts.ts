// Bridges the generic industry-objects engine (services/objectsEngine.js —
// real_estate/healthcare/education/ecommerce/automotive/field_services
// records) into the Lead shape that lending-era components (DialerSimulator
// chief among them) were built around. Non-lending orgs have no `leads`
// table rows at all, so without this their Voice Simulator has nothing
// real to dial — this maps their actual Industry Objects records into
// that shape instead of leaving it empty or fabricating anything.
//
// Field names vary per pack (industryPacks.js), so name/phone/email/budget
// are resolved from whichever of that pack's actual field keys exist,
// rather than assuming one fixed schema.

import { Lead } from '../types';

interface ObjectRecord {
  id: string;
  stageId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

interface ObjectStage {
  id: string;
  key: string;
  label: string;
}

interface ObjectField {
  id: string;
  key: string;
  label: string;
  type: string;
  required?: boolean;
}

function firstDefined(record: ObjectRecord, keys: string[]): string {
  for (const key of keys) {
    if (record[key]) return String(record[key]);
  }
  return '';
}

export function recordToLead(record: ObjectRecord, stages: ObjectStage[]): Lead {
  const stage = stages.find((s) => s.id === record.stageId);
  return {
    id: record.id,
    // Every industry pack's name-like field, across every pack currently
    // defined (services/industryPacks.js) — "contactName" (IT Sales
    // Leads) was missing here, so every contact for that pack displayed
    // as "Unnamed Contact" even though the record itself saved correctly.
    name: firstDefined(record, ['name', 'customerName', 'studentName', 'contactName']) || 'Unnamed Contact',
    phone: firstDefined(record, ['phone', 'parentPhone']),
    email: firstDefined(record, ['email']),
    amountRequested: Number(record.budget || record.orderValue || 0),
    score: 0,
    source: firstDefined(record, ['source', 'channel']),
    // Real object-pack stage labels don't match this lending-era union —
    // cast rather than force every pack's stages into New/Qualified/etc.
    status: (stage?.label || 'New') as Lead['status'],
    tags: Array.isArray(record.tags) ? record.tags : [],
    createdAt: record.createdAt || new Date().toISOString(),
    notes: firstDefined(record, ['notes', 'condition']),
  };
}

// What DialerSimulator actually mutates on a lead (tags, notes, status via
// handleHangupCall/handleSkipLead/handleSendUtterance) — translated back
// into an object_records patch. `status` only carries through if it
// matches one of this object's real stage labels; otherwise it's dropped
// rather than guessed (same rule as workflowEngine.js's lending-pack
// bridge on the backend).
export function leadToRecordPatch(lead: Lead, stages: ObjectStage[]): { stageKey?: string; notes?: string; tags?: string[] } {
  const patch: { stageKey?: string; notes?: string; tags?: string[] } = {
    notes: lead.notes,
    tags: lead.tags,
  };
  const stage = stages.find((s) => s.label.toLowerCase() === lead.status.toLowerCase());
  if (stage) patch.stageKey = stage.key;
  return patch;
}

// Builds the POST body for a brand-new contact added via LeadManagementView
// or CSV bulk import. Field keys vary per industry pack (e.g. "contactName"
// vs "customerName"), so — same approach as recordToLead's firstDefined —
// this resolves the right field to write into by TYPE (phone/email/
// currency) rather than assuming one fixed key name. Without this, new
// contacts for any non-lending org were only ever added to local/localStorage
// state (leadToRecordPatch has no way to create a record, only update
// tags/notes/stage on one that already exists) — they never actually
// reached the database at all.
export function leadToRecordCreate(lead: Lead, fields: ObjectField[]): Record<string, any> {
  const data: Record<string, any> = { tags: lead.tags || [], notes: lead.notes || '' };

  const nameField = fields.find((f) => f.type === 'text' && f.required) || fields.find((f) => f.type === 'text');
  const phoneField = fields.find((f) => f.type === 'phone') || fields.find((f) => f.key === 'phone');
  const emailField = fields.find((f) => f.type === 'email') || fields.find((f) => f.key === 'email');
  const amountField = fields.find((f) => f.type === 'currency' || f.type === 'number');

  if (nameField) data[nameField.key] = lead.name;
  if (phoneField) data[phoneField.key] = lead.phone;
  if (emailField && lead.email) data[emailField.key] = lead.email;
  if (amountField && lead.amountRequested) data[amountField.key] = lead.amountRequested;

  return data;
}
