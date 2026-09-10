import React, { useState } from 'react';
import { Plus, Trash2, ChevronRight, ChevronDown, Variable } from 'lucide-react';
import { WorkflowVariable, VariableDataType } from '../types';

function uid() {
  return `var-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

const DATA_TYPES: { value: VariableDataType; label: string }[] = [
  { value: 'string',  label: 'String' },
  { value: 'number',  label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date',    label: 'Date' },
  { value: 'array',   label: 'Array' },
  { value: 'object',  label: 'Object' },
];

const TYPE_COLOR: Record<VariableDataType, { bg: string; text: string }> = {
  string:  { bg: '#dbeafe', text: '#1d4ed8' },
  number:  { bg: '#d1fae5', text: '#065f46' },
  boolean: { bg: '#fef3c7', text: '#92400e' },
  date:    { bg: '#ede9fe', text: '#6d28d9' },
  array:   { bg: '#fce7f3', text: '#9d174d' },
  object:  { bg: 'var(--bg-subtle)', text: 'var(--text-secondary)' },
};

// ── Inline field input ────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</span>
      {children}
    </div>
  );
}

const inputCls = "text-xs rounded-lg px-2.5 py-1.5 border focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all";
const inputStyle: React.CSSProperties = { background: 'var(--bg-subtle)', borderColor: 'var(--border)', color: 'var(--text-primary)' };

// ── Single variable row ───────────────────────────────────────────────────────

interface VarRowProps {
  variable: WorkflowVariable;
  depth?: number;
  onChange: (updated: WorkflowVariable) => void;
  onDelete: () => void;
}

function VarRow({ variable: v, depth = 0, onChange, onDelete }: VarRowProps) {
  const [expanded, setExpanded] = useState(false);

  const update = (patch: Partial<WorkflowVariable>) => onChange({ ...v, ...patch });

  const addChild = () => {
    const child: WorkflowVariable = { id: uid(), name: '', dataType: 'string' };
    update({ children: [...(v.children ?? []), child] });
  };

  const updateChild = (idx: number, updated: WorkflowVariable) => {
    const children = [...(v.children ?? [])];
    children[idx] = updated;
    update({ children });
  };

  const deleteChild = (idx: number) => {
    update({ children: (v.children ?? []).filter((_, i) => i !== idx) });
  };

  const isObject = v.dataType === 'object';
  const hasChildren = isObject && (v.children ?? []).length > 0;
  const ChevronIcon = expanded ? ChevronDown : ChevronRight;

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)', marginLeft: depth * 20 }}>
      {/* Row header */}
      <div className="flex items-start gap-2 p-3" style={{ background: 'var(--bg-surface)' }}>
        {/* Expand toggle for objects */}
        <button
          onClick={() => isObject && setExpanded(e => !e)}
          className={`mt-1 shrink-0 h-5 w-5 rounded flex items-center justify-center transition-colors ${isObject ? 'cursor-pointer hover:bg-[var(--bg-subtle)]' : 'opacity-0 pointer-events-none'}`}
        >
          <ChevronIcon className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
        </button>

        {/* Fields row */}
        <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 min-w-0">
          <Field label="Name">
            <input
              className={inputCls}
              style={inputStyle}
              placeholder="variable_name"
              value={v.name}
              onChange={e => update({ name: e.target.value })}
            />
          </Field>

          <Field label="Type">
            <select
              className={`${inputCls} appearance-none cursor-pointer`}
              style={{ ...inputStyle,
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 8px center',
                paddingRight: 28,
              }}
              value={v.dataType}
              onChange={e => update({ dataType: e.target.value as VariableDataType, children: undefined })}
            >
              {DATA_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Default value">
            <input
              className={inputCls}
              style={inputStyle}
              placeholder={isObject ? '(nested)' : 'optional'}
              disabled={isObject}
              value={v.defaultValue ?? ''}
              onChange={e => update({ defaultValue: e.target.value })}
            />
          </Field>

          <Field label="Description">
            <input
              className={inputCls}
              style={inputStyle}
              placeholder="optional note"
              value={v.description ?? ''}
              onChange={e => update({ description: e.target.value })}
            />
          </Field>
        </div>

        {/* Type badge */}
        <span
          className="shrink-0 mt-1 text-[10px] font-bold px-2 py-0.5 rounded-md"
          style={{ background: TYPE_COLOR[v.dataType].bg, color: TYPE_COLOR[v.dataType].text }}
        >
          {v.dataType}
        </span>

        {/* Actions */}
        <div className="shrink-0 mt-0.5 flex items-center gap-1">
          {isObject && (
            <button
              onClick={addChild}
              title="Add nested variable"
              className="h-6 w-6 rounded flex items-center justify-center transition-colors hover:bg-[var(--bg-subtle)]"
              style={{ color: 'var(--text-muted)' }}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            onClick={onDelete}
            title="Delete variable"
            className="h-6 w-6 rounded flex items-center justify-center transition-colors hover:bg-rose-50 hover:text-rose-500"
            style={{ color: 'var(--text-muted)' }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Nested children */}
      {isObject && (expanded || hasChildren) && expanded && (
        <div className="p-3 space-y-2 border-t" style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}>
          {(v.children ?? []).length === 0 ? (
            <p className="text-xs text-center py-2" style={{ color: 'var(--text-muted)' }}>No nested variables yet. Click + to add one.</p>
          ) : (
            (v.children ?? []).map((child, idx) => (
              <VarRow
                key={child.id}
                variable={child}
                depth={0}
                onChange={u => updateChild(idx, u)}
                onDelete={() => deleteChild(idx)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface WorkflowVariablesProps {
  variables: WorkflowVariable[];
  onChange: (vars: WorkflowVariable[]) => void;
}

export default function WorkflowVariables({ variables, onChange }: WorkflowVariablesProps) {
  const addVar = () => {
    const v: WorkflowVariable = { id: uid(), name: '', dataType: 'string' };
    onChange([...variables, v]);
  };

  const update = (idx: number, updated: WorkflowVariable) => {
    const next = [...variables];
    next[idx] = updated;
    onChange(next);
  };

  const remove = (idx: number) => {
    onChange(variables.filter((_, i) => i !== idx));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0 border-b" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Workflow Variables</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Define variables, their data types, default values, and nested fields for this workflow.
          </p>
        </div>
        <button
          onClick={addVar}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Add Variable
        </button>
      </div>

      {/* Variable list */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {variables.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <Variable className="h-6 w-6" style={{ color: 'var(--text-muted)' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>No variables yet</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Add variables to pass dynamic data through this workflow.</p>
            </div>
            <button
              onClick={addVar}
              className="mt-1 flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add first variable
            </button>
          </div>
        ) : (
          variables.map((v, idx) => (
            <VarRow
              key={v.id}
              variable={v}
              onChange={u => update(idx, u)}
              onDelete={() => remove(idx)}
            />
          ))
        )}
      </div>

      {/* Footer legend */}
      {variables.length > 0 && (
        <div className="shrink-0 px-6 py-3 border-t flex items-center gap-4 flex-wrap" style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}>
          {DATA_TYPES.map(t => (
            <span key={t.value} className="flex items-center gap-1.5 text-[10px] font-semibold">
              <span className="inline-block px-1.5 py-0.5 rounded" style={{ background: TYPE_COLOR[t.value].bg, color: TYPE_COLOR[t.value].text }}>{t.label}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
