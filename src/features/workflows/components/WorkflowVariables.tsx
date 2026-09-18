import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, GitBranch, ArrowDown, MessageSquare, Save, Workflow } from 'lucide-react';
import { WorkflowVariable, WorkflowBranch, VariableDataType } from '../types';

function uid() {
  return `var-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ── Answer type chips ─────────────────────────────────────────────────────────

const ANSWER_TYPES: { value: VariableDataType; label: string; icon: string }[] = [
  { value: 'string',  label: 'Text',   icon: 'T' },
  { value: 'number',  label: 'Number', icon: '#' },
  { value: 'boolean', label: 'Yes/No', icon: '?' },
  { value: 'date',    label: 'Date',   icon: 'D' },
];

function AnswerTypeChips({ value, onChange }: { value: VariableDataType; onChange: (v: VariableDataType) => void }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {ANSWER_TYPES.map(t => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
            value === t.value
              ? 'bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-500/40'
              : 'border-[var(--border)] text-[var(--text-muted)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-surface)]'
          }`}
        >
          <span className="text-[10px]">{t.icon}</span> {t.label}
        </button>
      ))}
    </div>
  );
}

// ── Follow-up question (inside a branch) ─────────────────────────────────────

interface FollowUpCardProps {
  variable: WorkflowVariable;
  index: number;
  onChange: (v: WorkflowVariable) => void;
  onDelete: () => void;
}

function FollowUpCard({ variable: v, index, onChange, onDelete }: FollowUpCardProps) {
  const update = (patch: Partial<WorkflowVariable>) => onChange({ ...v, ...patch });

  return (
    <div className="rounded-xl border border-amber-200/70 dark:border-amber-500/25 bg-[var(--bg-surface)] p-3 space-y-2 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 bg-amber-500 dark:bg-amber-600">
          {index}
        </span>
        <textarea
          rows={2}
          className="flex-1 text-sm rounded-lg px-3 py-2 border resize-none outline-none transition-all focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 bg-[var(--bg-subtle)] border-[var(--border)] text-[var(--text-primary)]"
          placeholder="What should the AI ask next?"
          value={v.questionText ?? ''}
          onChange={e => update({ questionText: e.target.value })}
        />
        <button onClick={onDelete} className="shrink-0 h-6 w-6 flex items-center justify-center rounded text-[var(--text-muted)] hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 transition-colors">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-2 pl-7 flex-wrap">
        <span className="text-[10px] text-[var(--text-muted)]">Save answer as:</span>
        <input
          className="text-[11px] rounded px-2 py-1 border w-32 outline-none transition-all focus:ring-1 focus:ring-amber-400/50 font-mono bg-[var(--bg-subtle)] border-[var(--border)] text-[var(--text-secondary)]"
          placeholder="field_name"
          value={v.name}
          onChange={e => update({ name: e.target.value })}
        />
        <AnswerTypeChips value={v.dataType} onChange={t => update({ dataType: t })} />
      </div>
    </div>
  );
}

// ── Single branch ("If they say X → ask these") ───────────────────────────────

interface BranchBlockProps {
  branch: WorkflowBranch;
  index: number;
  onChange: (b: WorkflowBranch) => void;
  onDelete: () => void;
}

function BranchBlock({ branch, index, onChange, onDelete }: BranchBlockProps) {
  const [open, setOpen] = useState(true);

  const addFollowUp = () => {
    onChange({ ...branch, variables: [...branch.variables, { id: uid(), name: '', questionText: '', dataType: 'string' }] });
  };
  const updateFollowUp = (idx: number, v: WorkflowVariable) => {
    const next = [...branch.variables]; next[idx] = v; onChange({ ...branch, variables: next });
  };
  const removeFollowUp = (idx: number) => {
    onChange({ ...branch, variables: branch.variables.filter((_, i) => i !== idx) });
  };

  return (
    <div className="rounded-xl border border-amber-200/70 dark:border-amber-500/25 overflow-hidden">
      {/* Branch header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-500/10">
        <GitBranch className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
        <span className="text-[11px] font-bold shrink-0 text-amber-800 dark:text-amber-300">If caller says:</span>
        <input
          className="flex-1 text-xs rounded-lg px-2.5 py-1.5 border outline-none transition-all focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 bg-[var(--bg-surface)] border-amber-200 dark:border-amber-500/30 text-[var(--text-primary)]"
          placeholder={`e.g. "yes", "interested", "under 30"`}
          value={branch.condition}
          onChange={e => onChange({ ...branch, condition: e.target.value })}
        />
        <button
          onClick={() => setOpen(o => !o)}
          className="shrink-0 h-6 w-6 flex items-center justify-center rounded text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
        >
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={onDelete}
          className="shrink-0 h-6 w-6 flex items-center justify-center rounded text-[var(--text-muted)] hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Follow-up questions inside branch */}
      {open && (
        <div className="p-3 bg-amber-50/40 dark:bg-amber-500/[0.04]">
          {branch.variables.length === 0 ? (
            <p className="text-xs text-center py-2 text-amber-700 dark:text-amber-400">
              No follow-up questions yet. Add one below.
            </p>
          ) : (
            <div className="space-y-2 pl-3 border-l-2 border-amber-200 dark:border-amber-500/25 mb-2">
              {branch.variables.map((v, idx) => (
                <FollowUpCard
                  key={v.id}
                  variable={v}
                  index={idx + 1}
                  onChange={u => updateFollowUp(idx, u)}
                  onDelete={() => removeFollowUp(idx)}
                />
              ))}
            </div>
          )}
          <button
            onClick={addFollowUp}
            className="w-full flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-lg border border-dashed border-amber-300 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 transition-colors hover:bg-amber-100/60 dark:hover:bg-amber-500/10"
          >
            <Plus className="h-3 w-3" /> Add follow-up question
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main question card ────────────────────────────────────────────────────────

interface QuestionCardProps {
  variable: WorkflowVariable;
  index: number;
  total: number;
  onChange: (v: WorkflowVariable) => void;
  onDelete: () => void;
}

function QuestionCard({ variable: v, index, onChange, onDelete }: QuestionCardProps) {
  const [branchesOpen, setBranchesOpen] = useState((v.branches ?? []).length > 0);
  const update = (patch: Partial<WorkflowVariable>) => onChange({ ...v, ...patch });

  const addBranch = () => {
    update({ branches: [...(v.branches ?? []), { id: uid(), condition: '', label: '', variables: [] }] });
    setBranchesOpen(true);
  };
  const updateBranch = (idx: number, b: WorkflowBranch) => {
    const next = [...(v.branches ?? [])]; next[idx] = b; update({ branches: next });
  };
  const removeBranch = (idx: number) => {
    update({ branches: (v.branches ?? []).filter((_, i) => i !== idx) });
  };

  const hasBranches = (v.branches ?? []).length > 0;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Step number + delete */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-sm shadow-violet-500/30">
            <span className="text-[11px] font-bold text-white">{index}</span>
          </div>
          <span className="text-xs font-semibold text-[var(--text-secondary)]">Step {index}</span>
        </div>
        <button
          onClick={onDelete}
          className="h-7 w-7 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="px-4 pb-4 space-y-3">
        {/* Main question text — hero field */}
        <div>
          <label className="text-[11px] font-semibold mb-1.5 block text-[var(--text-muted)]">
            What should the AI say / ask?
          </label>
          <textarea
            rows={2}
            className="w-full text-sm rounded-xl px-3.5 py-2.5 border resize-none outline-none transition-all focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 bg-[var(--bg-subtle)] border-[var(--border)] text-[var(--text-primary)]"
            placeholder='e.g. "Hi! Are you still looking for a home loan?"'
            value={v.questionText ?? ''}
            onChange={e => update({ questionText: e.target.value })}
          />
        </div>

        {/* Secondary: save answer + type */}
        <div className="rounded-xl p-3 space-y-2 bg-violet-50/60 dark:bg-violet-500/[0.06] border border-violet-100 dark:border-violet-500/20">
          <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700/80 dark:text-violet-300/80">Save the caller's answer</p>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[var(--text-muted)]">As field:</span>
              <input
                className="text-[11px] rounded-lg px-2.5 py-1.5 border w-36 outline-none transition-all focus:ring-1 focus:ring-violet-400/50 font-mono bg-[var(--bg-surface)] border-[var(--border)] text-[var(--text-primary)]"
                placeholder="field_name"
                value={v.name}
                onChange={e => update({ name: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[var(--text-muted)]">Type:</span>
              <AnswerTypeChips value={v.dataType} onChange={t => update({ dataType: t })} />
            </div>
          </div>
        </div>

        {/* Conditional branches */}
        {hasBranches && (
          <div>
            <button
              onClick={() => setBranchesOpen(o => !o)}
              className="flex items-center gap-1.5 text-xs font-semibold mb-2 text-amber-700 dark:text-amber-400 transition-colors hover:opacity-80"
            >
              <GitBranch className="h-3.5 w-3.5" />
              {(v.branches ?? []).length} conditional branch{(v.branches ?? []).length !== 1 ? 'es' : ''}
              {branchesOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
            {branchesOpen && (
              <div className="space-y-2.5 pl-4 border-l-2 border-[var(--border)]">
                {(v.branches ?? []).map((b, idx) => (
                  <BranchBlock
                    key={b.id}
                    branch={b}
                    index={idx + 1}
                    onChange={u => updateBranch(idx, u)}
                    onDelete={() => removeBranch(idx)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Add branch button */}
        <button
          onClick={addBranch}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border border-dashed w-full justify-center transition-colors border-amber-300 dark:border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10"
        >
          <GitBranch className="h-3.5 w-3.5" />
          {hasBranches ? 'Add another branch' : 'Add conditional branch — ask different follow-ups based on answer'}
        </button>
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
    <div className="flex h-full overflow-hidden bg-[var(--bg-subtle)]">

      {/* Left: question flow */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar — page header already carries the flow name and a
            description of this view, so this stays a plain action bar
            rather than repeating a title here too. */}
        <div className="flex items-center justify-end px-6 py-3 shrink-0 border-b bg-[var(--bg-surface)] border-[var(--border)]">
          <button
            onClick={addVar}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl text-white transition-all bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-sm shadow-violet-500/20"
          >
            <Plus className="h-3.5 w-3.5" /> Add Question
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {variables.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <div className="h-16 w-16 rounded-2xl flex items-center justify-center bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20">
                <MessageSquare className="h-8 w-8 text-violet-400 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--text-primary)]">No questions yet</p>
                <p className="text-xs mt-1 max-w-sm text-[var(--text-muted)]">
                  Add the questions your AI agent will ask the caller, in order. You can branch based on their answers.
                </p>
              </div>
              <button
                onClick={addVar}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-white transition-all bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-sm shadow-violet-500/20"
              >
                <Plus className="h-3.5 w-3.5" /> Add first question
              </button>
            </div>
          ) : (
            <div className="max-w-xl mx-auto space-y-0">
              {/* START */}
              <div className="flex items-center gap-3 mb-3">
                <div className="h-8 px-3 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm shadow-emerald-500/30">
                  <span className="text-[10px] font-bold text-white tracking-widest">START</span>
                </div>
                <div className="flex-1 h-px bg-[var(--border)]" />
              </div>

              {variables.map((v, idx) => (
                <div key={v.id}>
                  <QuestionCard
                    variable={v}
                    index={idx + 1}
                    total={variables.length}
                    onChange={u => update(idx, u)}
                    onDelete={() => remove(idx)}
                  />
                  {idx < variables.length - 1 && (
                    <div className="flex justify-center py-2">
                      <ArrowDown className="h-4 w-4 text-[var(--border)]" />
                    </div>
                  )}
                </div>
              ))}

              {/* END */}
              <div className="flex items-center gap-3 mt-3">
                <div className="flex-1 h-px bg-[var(--border)]" />
                <div className="h-8 px-3 rounded-full bg-slate-500 dark:bg-slate-600 flex items-center justify-center shadow-sm">
                  <span className="text-[10px] font-bold text-white tracking-widest">END</span>
                </div>
              </div>

              {/* Add more */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={addVar}
                  className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl border border-dashed transition-colors text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--bg-surface)]"
                >
                  <Plus className="h-3.5 w-3.5" /> Add another question
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: explainer panel */}
      <div className="w-64 shrink-0 border-l flex flex-col border-[var(--border)] bg-[var(--bg-surface)]">
        <div className="px-4 py-4 border-b border-[var(--border)]">
          <p className="text-xs font-bold text-[var(--text-primary)]">How it works</p>
        </div>
        <div className="p-4 space-y-5 overflow-y-auto flex-1">
          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
              <MessageSquare className="h-3.5 w-3.5" /> Questions
            </p>
            <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
              Each step is a question the AI asks the caller. They are asked one by one in order.
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
              <GitBranch className="h-3.5 w-3.5" /> Branches
            </p>
            <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
              Add a branch to ask different follow-up questions depending on what the caller says.
            </p>
            <div className="rounded-lg p-2.5 text-[10px] leading-relaxed bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25 text-amber-900 dark:text-amber-300">
              <strong>Example:</strong><br />
              Ask "Are you interested?"<br />
              → If <em>"yes"</em>: ask for budget<br />
              → If <em>"no"</em>: ask why not
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              <Save className="h-3.5 w-3.5" /> Save answer
            </p>
            <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
              Give each answer a field name (like <code className="font-mono text-[10px] px-1 rounded bg-[var(--bg-subtle)]">customer_name</code>) so the AI can reference it later.
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-secondary)]">
              <Workflow className="h-3.5 w-3.5" /> Diagram tab
            </p>
            <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">
              Switch to the Diagram tab to see a visual flowchart of this conversation — and edit it directly if needed.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
