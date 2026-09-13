import React, { useState } from 'react';
import {
  GitBranch,
  Plus,
  Trash2,
  Edit2,
  ToggleRight,
  ToggleLeft,
  ChevronRight,
  ArrowLeft,
  Copy,
  X,
  Network,
  Variable,
  Braces,
  ClipboardCopy,
  Check,
} from 'lucide-react';
import { QuestionFlow, WorkflowVariable } from './types';
import QuestionFlowBuilder from './QuestionFlowBuilder';
import WorkflowVariables from './components/WorkflowVariables';
import PageShell from '../../components/ui/PageShell';
import Widget from '../../components/ui/Widget';
import Modal from '../../components/ui/Modal';
import IconButton from '../../components/ui/IconButton';
import DataTable, { Column } from '../../components/ui/DataTable';

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function createDefaultFlow(name: string): QuestionFlow {
  return {
    id: uid('flow'),
    name,
    description: '',
    nodes: [],
    edges: [],
    active: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

interface WorkflowsViewProps {
  flows: QuestionFlow[];
  setFlows: React.Dispatch<React.SetStateAction<QuestionFlow[]>>;
}

export default function WorkflowsView({ flows, setFlows }: WorkflowsViewProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editorView, setEditorView] = useState<'diagram' | 'variables' | 'json'>('diagram');
  const [jsonCopied, setJsonCopied] = useState(false);
  const [jsonEditText, setJsonEditText] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const editingFlow = flows.find(f => f.id === editingId);

  const handleCreate = () => {
    if (!newName.trim()) return;
    const flow = createDefaultFlow(newName.trim());
    setFlows(prev => [...prev, flow]);
    setNewName('');
    setCreating(false);
    setEditingId(flow.id);
    setEditorView('variables'); // start on variables so user defines them first
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this workflow?')) return;
    setFlows(prev => prev.filter(f => f.id !== id));
  };

  const handleToggleActive = (id: string) => {
    setFlows(prev => prev.map(f => (f.id === id ? { ...f, active: !f.active } : f)));
  };

  const handleDuplicate = (flow: QuestionFlow) => {
    const copy: QuestionFlow = {
      ...flow,
      id: uid('flow'),
      name: `${flow.name} (copy)`,
      active: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setFlows(prev => [...prev, copy]);
  };

  const handleFlowChange = (updated: QuestionFlow) => {
    setFlows(prev => prev.map(f => (f.id === updated.id ? updated : f)));
  };

  if (editingFlow) {
    const VIEWS = [
      { id: 'diagram'   as const, label: 'Diagram',   icon: Network   },
      { id: 'variables' as const, label: 'Variables',  icon: Variable  },
      { id: 'json'      as const, label: 'JSON',       icon: Braces    },
    ];

    return (
      <PageShell
        title={editingFlow.name}
        subtitle="Design question nodes, conditional branches, and call routing logic."
        layout="fill"
        action={
          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex items-center rounded-xl p-0.5 gap-0.5" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
              {VIEWS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setEditorView(id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={editorView === id
                    ? id === 'json'
                      ? { background: '#d97706', color: '#ffffff' }
                      : { background: '#2563eb', color: '#ffffff' }
                    : { background: 'transparent', color: 'var(--text-secondary)' }
                  }
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                  {id === 'variables' && (editingFlow.variables ?? []).length > 0 && (
                    <span
                      className="ml-0.5 text-[10px] font-bold px-1.5 py-0 rounded-full"
                      style={editorView === 'variables'
                        ? { background: 'rgba(255,255,255,0.25)', color: '#fff' }
                        : { background: 'var(--border)', color: 'var(--text-muted)' }
                      }
                    >
                      {(editingFlow.variables ?? []).length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {editingFlow.active && (
              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">ACTIVE</span>
            )}
            <button
              onClick={() => setEditingId(null)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--border)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-subtle)'; }}
            >
              <ArrowLeft className="h-3.5 w-3.5" /> All Workflows
            </button>
          </div>
        }
      >
        <div className="flex-1 overflow-hidden">
          {editorView === 'diagram' && (
            <QuestionFlowBuilder
              flow={editingFlow}
              allFlows={flows}
              onChange={handleFlowChange}
            />
          )}
          {editorView === 'variables' && (
            <WorkflowVariables
              variables={editingFlow.variables ?? []}
              onChange={(vars: WorkflowVariable[]) => {
                handleFlowChange({ ...editingFlow, variables: vars, nodes: [], edges: [] });
              }}
            />
          )}
          {editorView === 'json' && (() => {
            const cleanVar = (v: WorkflowVariable): object => ({
              name: v.name,
              questionText: v.questionText,
              dataType: v.dataType,
              ...((v.branches ?? []).length > 0 ? {
                branches: (v.branches ?? []).map(b => ({
                  condition: b.condition,
                  followUp: (b.variables ?? []).map(cleanVar)
                }))
              } : {})
            });
            const cleanJson = {
              name: editingFlow.name,
              ...(editingFlow.description ? { description: editingFlow.description } : {}),
              questions: (editingFlow.variables ?? []).map(cleanVar)
            };
            const jsonStr = jsonEditText ?? JSON.stringify(cleanJson, null, 2);

            const applyJson = () => {
              try {
                const parsed = JSON.parse(jsonStr);
                const questions: WorkflowVariable[] = (parsed.questions ?? []).map((q: any, i: number) => ({
                  id: `v-import-${Date.now()}-${i}`,
                  name: q.name || `question_${i + 1}`,
                  questionText: q.questionText || q.question || '',
                  dataType: q.dataType || 'text',
                  branches: (q.branches ?? []).map((b: any, bi: number) => ({
                    id: `b-import-${Date.now()}-${i}-${bi}`,
                    condition: b.condition || '',
                    variables: (b.followUp ?? b.variables ?? []).map((fv: any, fi: number) => ({
                      id: `v-import-${Date.now()}-${i}-${bi}-${fi}`,
                      name: fv.name || `followup_${fi + 1}`,
                      questionText: fv.questionText || fv.question || '',
                      dataType: fv.dataType || 'text',
                      branches: [],
                    })),
                  })),
                }));
                handleFlowChange({
                  ...editingFlow,
                  name: parsed.name || editingFlow.name,
                  description: parsed.description || editingFlow.description,
                  variables: questions,
                  nodes: [],
                  edges: [],
                });
                setJsonEditText(null);
                setJsonError(null);
                setEditorView('variables');
              } catch (e: any) {
                setJsonError(e.message);
              }
            };

            return (
              <div className="h-full flex flex-col" style={{ background: '#0f172a' }}>
                <div className="flex items-center justify-between px-5 py-3 border-b shrink-0" style={{ borderColor: '#1e293b' }}>
                  <div className="flex items-center gap-2">
                    <Braces className="h-4 w-4" style={{ color: '#f59e0b' }} />
                    <span className="text-xs font-bold" style={{ color: '#f1f5f9' }}>Workflow JSON</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: '#1e293b', color: '#64748b' }}>editable · paste or type</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { navigator.clipboard.writeText(jsonStr); setJsonCopied(true); setTimeout(() => setJsonCopied(false), 2000); }}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      style={{ background: jsonCopied ? '#064e3b' : '#1e293b', color: jsonCopied ? '#34d399' : '#94a3b8' }}
                    >
                      {jsonCopied ? <Check className="h-3.5 w-3.5" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
                      {jsonCopied ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={applyJson}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      style={{ background: '#2563eb', color: '#ffffff' }}
                    >
                      <Check className="h-3.5 w-3.5" /> Apply JSON
                    </button>
                  </div>
                </div>
                {jsonError && (
                  <div className="px-5 py-2 text-xs font-mono shrink-0" style={{ background: '#450a0a', color: '#fca5a5' }}>
                    ⚠ {jsonError}
                  </div>
                )}
                <div className="flex-1 overflow-hidden p-5">
                  <textarea
                    className="w-full h-full resize-none font-mono text-xs leading-relaxed outline-none border-0 bg-transparent"
                    style={{ color: '#e2e8f0', caretColor: '#f59e0b' }}
                    value={jsonStr}
                    onChange={e => { setJsonEditText(e.target.value); setJsonError(null); }}
                    spellCheck={false}
                  />
                </div>
              </div>
            );
          })()}
        </div>
      </PageShell>
    );
  }

  const columns: Column<QuestionFlow>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (flow) => (
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-slate-800 dark:text-[var(--text-primary)] truncate">{flow.name}</span>
          {flow.active && (
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full shrink-0">ACTIVE</span>
          )}
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      cell: (flow) => (
        <span className="text-slate-500 dark:text-[var(--text-muted)] truncate block max-w-sm" title={flow.description || ''}>
          {flow.description || '—'}
        </span>
      ),
    },
    { key: 'nodes', header: 'Nodes', cell: (flow) => (flow.nodes ?? []).length, align: 'center' },
    { key: 'connections', header: 'Connections', cell: (flow) => (flow.edges ?? []).length, align: 'center' },
    { key: 'updated', header: 'Updated', cell: (flow) => new Date(flow.updatedAt).toLocaleDateString() },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (flow) => (
        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
          <button onClick={() => handleToggleActive(flow.id)} title={flow.active ? 'Deactivate' : 'Activate'} className="text-slate-400 hover:text-blue-600 transition-colors">
            {flow.active ? <ToggleRight className="h-6 w-6 text-blue-600" /> : <ToggleLeft className="h-6 w-6" />}
          </button>
          <button onClick={() => handleDuplicate(flow)} title="Duplicate" className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
            <Copy className="h-4 w-4" />
          </button>
          <button onClick={() => setEditingId(flow.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100">
            <Edit2 className="h-3.5 w-3.5" /> Edit
          </button>
          <button onClick={() => handleDelete(flow.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <PageShell
      title="Workflow Builder"
      subtitle="Design question flows with conditional branching — skip, jump, or end based on answers."
      action={<IconButton icon={Plus} label="New Workflow" onClick={() => setCreating(true)} />}
    >
      <Widget colSpan={12} showHeader={false} padding="none">
        {flows.length === 0 ? (
          <div className="text-center py-20">
            <GitBranch className="h-12 w-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 text-sm font-medium">No workflows yet.</p>
            <p className="text-slate-400 text-xs mt-1">Create one to design your call question flow.</p>
            <button
              onClick={() => setCreating(true)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700"
            >
              Create your first workflow
            </button>
          </div>
        ) : (
          <DataTable
            bare
            columns={columns}
            rows={flows}
            rowKey={(flow) => flow.id}
            onRowClick={(flow) => setEditingId(flow.id)}
          />
        )}
      </Widget>

      {/* New Workflow modal */}
      {creating && (
        <Modal open onClose={() => setCreating(false)} title="New Workflow" maxWidth="max-w-md">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Workflow Name</label>
            <input
              autoFocus
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              placeholder="e.g. Personal Loan Qualification Flow"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false); }}
            />
            <div className="flex items-center justify-end gap-3">
              <button onClick={() => setCreating(false)} className="text-sm text-slate-400 hover:text-slate-600 font-medium px-3 py-2 cursor-pointer">Cancel</button>
              <button onClick={handleCreate} className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 cursor-pointer">Create</button>
            </div>
          </div>
        </Modal>
      )}
    </PageShell>
  );
}
