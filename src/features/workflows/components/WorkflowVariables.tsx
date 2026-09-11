import React, { useState } from 'react';
import {
  Plus, Trash2, ChevronDown, ChevronRight, MessageSquare, GitBranch, GripVertical,
} from 'lucide-react';
import { WorkflowVariable, WorkflowBranch, VariableDataType } from '../types';

function uid() {
  return `var-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

const DATA_TYPES: { value: VariableDataType; label: string }[] = [
  { value: 'string',  label: 'Text' },
  { value: 'number',  label: 'Number' },
  { value: 'boolean', label: 'Yes/No' },
  { value: 'date',    label: 'Date' },
  { value: 'array',   label: 'List' },
];

const inputCls =
  'text-xs rounded-lg px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all w-full';
const inputStyle: React.CSSProperties = {
  background: 'var(--bg-subtle)',
  borderColor: 'var(--border)',
  color: 'var(--text-primary)',
};

// ── Branch nested questions ───────────────────────────────────────────────────

interface BranchQuestionsProps {
  variables: WorkflowVariable[];
  onChange: (vars: WorkflowVariable[]) => void;
  depth: number;
}

function BranchQuestions({ variables, onChange, depth }: BranchQuestionsProps) {
  const addQ = () => {
    onChange([...variables, { id: uid(), name: '', questionText: '', dataType: 'string' }]);
  };
  const updateQ = (idx: number, v: WorkflowVariable) => {
    const next = [...variables]; next[idx] = v; onChange(next);
  };
  const removeQ = (idx: number) => onChange(variables.filter((_, i) => i !== idx));

  return (
    <div className="pl-4 border-l-2 border-dashed mt-2 space-y-2" style={{ borderColor: 'var(--border)' }}>
      {variables.map((v, idx) => (
        <QuestionCard
          key={v.id}
          variable={v}
          index={idx + 1}
          depth={depth}
          onChange={u => updateQ(idx, u)}
          onDelete={() => removeQ(idx)}
        />
      ))}
      <button
        onClick={addQ}
        className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors"
        style={{ color: 'var(--text-muted)', background: 'var(--bg-subtle)', border: '1px dashed var(--border)' }}
      >
        <Plus className="h-3 w-3" /> Add follow-up question
      </button>
    </div>
  );
}

// ── Single branch row ─────────────────────────────────────────────────────────

interface BranchRowProps {
  branch: WorkflowBranch;
  index: number;
  depth: number;
  onChange: (b: WorkflowBranch) => void;
  onDelete: () => void;
}

function BranchRow({ branch, index, depth, onChange, onDelete }: BranchRowProps) {
  const [expanded, setExpanded] = useState(true);
  const Icon = expanded ? ChevronDown : ChevronRight;

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-subtle)' }}
    >
      {/* Branch header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <button onClick={() => setExpanded(e => !e)} className="shrink-0">
          <Icon className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
        </button>
        <span
          className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: '#fef9c3', color: '#854d0e' }}
        >
          Branch {index}
        </span>
        <input
          className={inputCls}
          style={inputStyle}
          placeholder='If answer is… e.g. "yes", "interested", "under 30"'
          value={branch.condition}
          onChange={e => onChange({ ...branch, condition: e.target.value })}
        />
        <button
          onClick={onDelete}
          className="shrink-0 h-6 w-6 flex items-center justify-center rounded hover:bg-rose-50 transition-colors"
          style={{ color: 'var(--text-muted)' }}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Nested follow-up questions */}
      {expanded && (
        <div className="px-3 pb-3">
          <BranchQuestions
            variables={branch.variables}
            onChange={vars => onChange({ ...branch, variables: vars })}
            depth={depth + 1}
          />
        </div>
      )}
    </div>
  );
}

// ── Single question card ──────────────────────────────────────────────────────

interface QuestionCardProps {
  variable: WorkflowVariable;
  index: number;
  depth?: number;
  onChange: (v: WorkflowVariable) => void;
  onDelete: () => void;
}

function QuestionCard({ variable: v, index, depth = 0, onChange, onDelete }: QuestionCardProps) {
  const [branchOpen, setBranchOpen] = useState(false);

  const update = (patch: Partial<WorkflowVariable>) => onChange({ ...v, ...patch });

  const addBranch = () => {
    const b: WorkflowBranch = { id: uid(), condition: '', label: '', variables: [] };
    update({ branches: [...(v.branches ?? []), b] });
    setBranchOpen(true);
  };

  const updateBranch = (idx: number, b: WorkflowBranch) => {
    const next = [...(v.branches ?? [])]; next[idx] = b; update({ branches: next });
  };

  const removeBranch = (idx: number) => {
    update({ branches: (v.branches ?? []).filter((_, i) => i !== idx) });
  };

  const hasBranches = (v.branches ?? []).length > 0;

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: 'var(--border)', background: 'var(--bg-surface)' }}
    >
      {/* Top accent */}
      <div className="h-1 w-full" style={{
        background: depth === 0
          ? 'linear-gradient(to right, #6366f1, #8b5cf6)'
          : 'linear-gradient(to right, #f59e0b, #d97706)',
      }} />

      <div className="p-4">
        {/* Card header */}
        <div className="flex items-center gap-2 mb-3">
          <GripVertical className="h-4 w-4 shrink-0 opacity-30 cursor-grab" />
          <span
            className="shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
            style={{ background: depth === 0 ? '#6366f1' : '#f59e0b' }}
          >
            {index}
          </span>
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <input
              className={inputCls}
              style={inputStyle}
              placeholder="variable_name (e.g. customer_name)"
              value={v.name}
              onChange={e => update({ name: e.target.value })}
            />
            <select
              className="text-xs rounded-lg px-2.5 py-2 border focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all shrink-0"
              style={{ ...inputStyle, minWidth: 90 }}
              value={v.dataType}
              onChange={e => update({ dataType: e.target.value as VariableDataType, branches: undefined })}
            >
              {DATA_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <button
            onClick={onDelete}
            className="shrink-0 h-7 w-7 flex items-center justify-center rounded-lg hover:bg-rose-50 transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Question text */}
        <div className="mb-3">
          <label className="text-[10px] font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
            <MessageSquare className="h-3 w-3" /> Question text (spoken by AI)
          </label>
          <textarea
            rows={2}
            className="text-xs rounded-xl px-3 py-2.5 border focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all w-full resize-none"
            style={inputStyle}
            placeholder='e.g. "Hi, may I know your full name please?"'
            value={v.questionText ?? ''}
            onChange={e => update({ questionText: e.target.value })}
          />
        </div>

        {/* Conditional branches */}
        {hasBranches && (
          <div className="mb-3">
            <button
              onClick={() => setBranchOpen(b => !b)}
              className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider mb-2"
              style={{ color: '#d97706' }}
            >
              <GitBranch className="h-3 w-3" />
              Conditional branches ({(v.branches ?? []).length})
              {branchOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>
            {branchOpen && (
              <div className="space-y-2">
                {(v.branches ?? []).map((b, idx) => (
                  <BranchRow
                    key={b.id}
                    branch={b}
                    index={idx + 1}
                    depth={depth}
                    onChange={u => updateBranch(idx, u)}
                    onDelete={() => removeBranch(idx)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={addBranch}
            className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
            style={{ color: '#d97706', background: '#fef9c3', border: '1px solid #fde68a' }}
          >
            <GitBranch className="h-3 w-3" /> Add conditional branch
          </button>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            Branch fires when caller's answer matches a condition
          </span>
        </div>
      </div>
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
    onChange([...variables, { id: uid(), name: '', questionText: '', dataType: 'string' }]);
  };

  const update = (idx: number, v: WorkflowVariable) => {
    const next = [...variables]; next[idx] = v; onChange(next);
  };

  const remove = (idx: number) => onChange(variables.filter((_, i) => i !== idx));

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-6 py-4 shrink-0 border-b"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Question Flow</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Questions are asked in sequence. Add conditional branches for follow-ups based on the caller's answer.
          </p>
        </div>
        <button
          onClick={addVar}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> Add Question
        </button>
      </div>

      {/* Question list */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {variables.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div
              className="h-14 w-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            >
              <MessageSquare className="h-7 w-7" style={{ color: 'var(--text-muted)' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>No questions yet</p>
              <p className="text-xs mt-1 max-w-xs" style={{ color: 'var(--text-muted)' }}>
                Add questions the AI will ask in sequence. Use conditional branches to ask follow-ups based on the caller's answer.
              </p>
            </div>
            <button
              onClick={addVar}
              className="mt-1 flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add first question
            </button>
          </div>
        ) : (
          <>
            {/* Start indicator */}
            <div className="flex items-center gap-3 px-2">
              <div className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-white">START</span>
              </div>
              <div className="flex-1 h-px bg-emerald-200" />
            </div>

            {variables.map((v, idx) => (
              <React.Fragment key={v.id}>
                <QuestionCard
                  variable={v}
                  index={idx + 1}
                  onChange={u => update(idx, u)}
                  onDelete={() => remove(idx)}
                />
                {idx < variables.length - 1 && (
                  <div className="flex justify-center">
                    <div className="w-px h-4 bg-slate-300" />
                  </div>
                )}
              </React.Fragment>
            ))}

            {/* End indicator */}
            <div className="flex items-center gap-3 px-2">
              <div className="flex-1 h-px bg-red-200" />
              <div className="h-8 w-8 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-white">END</span>
              </div>
            </div>

            <div className="flex justify-center pt-2">
              <button
                onClick={addVar}
                className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl transition-colors"
                style={{ color: 'var(--text-secondary)', background: 'var(--bg-surface)', border: '1px dashed var(--border)' }}
              >
                <Plus className="h-3.5 w-3.5" /> Add another question
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
