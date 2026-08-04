import React, { useEffect, useState } from 'react';
import { Plus, X, ChevronRight, Trash2, Boxes, Loader2 } from 'lucide-react';
import { apiFetch } from '../lib/api';
import PageHeader from './PageHeader';

interface ObjectField {
  id: string;
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'currency' | 'date' | 'boolean' | 'select' | 'phone' | 'email';
  options: string[];
  required: boolean;
}

interface ObjectStage {
  id: string;
  key: string;
  label: string;
  color: string;
}

interface CustomObject {
  id: string;
  key: string;
  label: string;
  icon: string;
  description: string | null;
  hasPipeline: boolean;
  fields: ObjectField[];
  stages: ObjectStage[];
}

interface ObjectRecord {
  id: string;
  objectId: string;
  stageId: string | null;
  createdAt: string;
  updatedAt: string;
  [fieldKey: string]: unknown;
}

function FieldInput({ field, value, onChange }: { field: ObjectField; value: unknown; onChange: (v: unknown) => void }) {
  const baseClass = "w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500";
  if (field.type === 'textarea') {
    return <textarea className={baseClass} rows={3} value={(value as string) || ''} onChange={(e) => onChange(e.target.value)} required={field.required} />;
  }
  if (field.type === 'select') {
    return (
      <select className={baseClass} value={(value as string) || ''} onChange={(e) => onChange(e.target.value)} required={field.required}>
        <option value="" disabled>Select…</option>
        {field.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
    );
  }
  if (field.type === 'boolean') {
    return (
      <input type="checkbox" className="h-4 w-4" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
    );
  }
  const inputType = field.type === 'number' || field.type === 'currency' ? 'number'
    : field.type === 'date' ? 'date'
    : field.type === 'email' ? 'email'
    : field.type === 'phone' ? 'tel'
    : 'text';
  return (
    <input
      type={inputType}
      className={baseClass}
      value={(value as string | number) ?? ''}
      onChange={(e) => onChange(inputType === 'number' ? Number(e.target.value) : e.target.value)}
      required={field.required}
    />
  );
}

function RecordCard({ object, record, onAdvance, onDelete }: {
  object: CustomObject;
  record: ObjectRecord;
  onAdvance: (() => void) | null;
  onDelete: () => void;
}) {
  const primaryFields = object.fields.slice(0, 3);
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 mb-2 shadow-sm hover:shadow-md transition-shadow group">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          {primaryFields.map((f) => (
            <div key={f.key} className="text-xs truncate">
              {f.key === primaryFields[0].key ? (
                <span className="font-semibold text-slate-800">{String(record[f.key] ?? '—')}</span>
              ) : (
                <span className="text-slate-500">{f.label}: {String(record[f.key] ?? '—')}</span>
              )}
            </div>
          ))}
        </div>
        <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-opacity shrink-0 ml-2">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {onAdvance && (
        <button
          onClick={onAdvance}
          className="mt-2 w-full flex items-center justify-center gap-1 text-[10px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg py-1.5 transition-colors"
        >
          Move forward <ChevronRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export default function CustomObjectsView() {
  const [objects, setObjects] = useState<CustomObject[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [records, setRecords] = useState<ObjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  useEffect(() => {
    apiFetch('/api/objects')
      .then((r) => r.json())
      .then((list: CustomObject[]) => {
        setObjects(list);
        if (list.length > 0) setSelectedKey(list[0].key);
      })
      .catch(() => setObjects([]))
      .finally(() => setLoading(false));
  }, []);

  const selectedObject = objects.find((o) => o.key === selectedKey) || null;

  useEffect(() => {
    if (!selectedKey) return;
    setRecordsLoading(true);
    apiFetch(`/api/objects/${selectedKey}/records`)
      .then((r) => r.json())
      .then((list: ObjectRecord[]) => setRecords(list))
      .catch(() => setRecords([]))
      .finally(() => setRecordsLoading(false));
  }, [selectedKey]);

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedObject) return;
    const res = await apiFetch(`/api/objects/${selectedObject.key}/records`, {
      method: 'POST',
      body: JSON.stringify(formData)
    });
    if (res.ok) {
      const created = await res.json();
      setRecords((prev) => [created, ...prev]);
      setShowForm(false);
      setFormData({});
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to create record');
    }
  };

  const handleAdvanceStage = async (record: ObjectRecord) => {
    if (!selectedObject) return;
    const currentIdx = selectedObject.stages.findIndex((s) => s.id === record.stageId);
    const nextStage = selectedObject.stages[currentIdx + 1];
    if (!nextStage) return;
    const res = await apiFetch(`/api/objects/${selectedObject.key}/records/${record.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ stageKey: nextStage.key })
    });
    if (res.ok) {
      const updated = await res.json();
      setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    }
  };

  const handleDeleteRecord = async (record: ObjectRecord) => {
    if (!selectedObject) return;
    if (!confirm('Delete this record?')) return;
    const res = await apiFetch(`/api/objects/${selectedObject.key}/records/${record.id}`, { method: 'DELETE' });
    if (res.ok) setRecords((prev) => prev.filter((r) => r.id !== record.id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  if (objects.length === 0) {
    return (
      <div className="p-8 font-sans">
        <PageHeader title="Industry Objects" subtitle="Custom pipelines for your business, beyond lending." />
        <div className="px-8 flex flex-col items-center justify-center py-20 text-center bg-white border border-slate-200 rounded-2xl mx-8">
          <Boxes className="h-10 w-10 text-slate-300 mb-3" />
          <p className="text-sm text-slate-500 max-w-sm">
            No custom objects are configured for this organization. These are seeded automatically based on the industry chosen at signup (Real Estate, Healthcare, Education, E-commerce, Automotive, Field Services).
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="font-sans h-full flex flex-col">
      <PageHeader
        title={selectedObject?.label || 'Industry Objects'}
        subtitle={selectedObject?.description || undefined}
        action={
          <button
            onClick={() => { setFormData({}); setShowForm(true); }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            <Plus className="h-4 w-4" /> New {selectedObject?.label.replace(/s$/, '')}
          </button>
        }
      />

      {objects.length > 1 && (
        <div className="px-8 flex gap-2 mb-4">
          {objects.map((o) => (
            <button
              key={o.key}
              onClick={() => setSelectedKey(o.key)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                o.key === selectedKey ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-x-auto px-8 pb-8">
        {recordsLoading ? (
          <div className="flex items-center text-slate-400 text-sm"><Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading records…</div>
        ) : selectedObject?.hasPipeline ? (
          <div className="flex gap-4 min-w-max">
            {selectedObject.stages.map((stage) => {
              const stageRecords = records.filter((r) => r.stageId === stage.id);
              return (
                <div key={stage.id} className="w-64 shrink-0">
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stage.color }}></span>
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">{stage.label}</span>
                    <span className="text-[10px] text-slate-400">({stageRecords.length})</span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-2 min-h-[200px]">
                    {stageRecords.map((r) => (
                      <RecordCard
                        key={r.id}
                        object={selectedObject}
                        record={r}
                        onAdvance={selectedObject.stages.findIndex((s) => s.id === r.stageId) < selectedObject.stages.length - 1 ? () => handleAdvanceStage(r) : null}
                        onDelete={() => handleDeleteRecord(r)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {records.map((r) => selectedObject && (
              <RecordCard key={r.id} object={selectedObject} record={r} onAdvance={null} onDelete={() => handleDeleteRecord(r)} />
            ))}
          </div>
        )}
      </div>

      {showForm && selectedObject && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">New {selectedObject.label.replace(/s$/, '')}</h3>
              <button onClick={() => setShowForm(false)}><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleCreateRecord} className="p-5 space-y-4">
              {selectedObject.fields.map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                    {field.label} {field.required && <span className="text-rose-500">*</span>}
                  </label>
                  <FieldInput
                    field={field}
                    value={formData[field.key]}
                    onChange={(v) => setFormData((prev) => ({ ...prev, [field.key]: v }))}
                  />
                </div>
              ))}
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-2.5 rounded-xl transition-colors">
                Create
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
