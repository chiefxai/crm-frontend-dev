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
} from 'lucide-react';
import { QuestionFlow, QuestionFlowNode, QuestionFlowEdge, WorkflowVariable } from './types';
import QuestionFlowBuilder from './QuestionFlowBuilder';
import WorkflowVariables from './components/WorkflowVariables';
import PageShell from '../../components/ui/PageShell';
import Widget from '../../components/ui/Widget';
import Modal from '../../components/ui/Modal';

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function createDefaultFlow(name: string): QuestionFlow {
  const startId = uid('n');
  const q1Id = uid('n');
  const yesId = uid('n');
  const noId = uid('n');
  const endId = uid('n');
  const opt1Id = uid('opt');
  const opt2Id = uid('opt');

  const nodes: QuestionFlowNode[] = [
    { id: startId, type: 'start', label: 'Start', position: { x: 200, y: 30 } },
    {
      id: q1Id,
      type: 'question',
      label: 'Opening Question',
      questionText: 'Hi, am I speaking with [Name]? Are you interested in our offer?',
      options: [
        { id: opt1Id, text: 'Yes, interested', goToNodeId: yesId },
        { id: opt2Id, text: 'No, not interested', goToNodeId: noId, terminateFlow: true },
      ],
      position: { x: 140, y: 140 },
    },
    {
      id: yesId,
      type: 'action',
      label: 'Assign Agent',
      actionType: 'assign_agent',
      actionValue: 'Senior Sales Agent',
      position: { x: 60, y: 300 },
    },
    {
      id: noId,
      type: 'action',
      label: 'Close Lead',
      actionType: 'close_lead',
      position: { x: 280, y: 300 },
    },
    { id: endId, type: 'end', label: 'End', position: { x: 200, y: 430 } },
  ];

  const edges: QuestionFlowEdge[] = [
    { id: uid('e'), source: startId, target: q1Id },
    { id: uid('e'), source: q1Id, target: yesId, optionId: opt1Id, label: 'Yes' },
    { id: uid('e'), source: q1Id, target: noId, optionId: opt2Id, label: 'No' },
    { id: uid('e'), source: yesId, target: endId },
    { id: uid('e'), source: noId, target: endId },
  ];

  return {
    id: uid('flow'),
    name,
    description: '',
    nodes,
    edges,
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
  const [editorView, setEditorView] = useState<'diagram' | 'variables'>('diagram');
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
      { id: 'diagram' as const, label: 'Diagram', icon: Network },
      { id: 'variables' as const, label: 'Variables', icon: Variable },
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
                    ? { background: '#2563eb', color: '#ffffff' }
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
          {editorView === 'diagram' ? (
            <QuestionFlowBuilder
              flow={editingFlow}
              allFlows={flows}
              onChange={handleFlowChange}
            />
          ) : (
            <WorkflowVariables
              variables={editingFlow.variables ?? []}
              onChange={(vars: WorkflowVariable[]) => handleFlowChange({ ...editingFlow, variables: vars })}
            />
          )}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Workflow Builder"
      subtitle="Design question flows with conditional branching — skip, jump, or end based on answers."
      action={
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" /> New Workflow
        </button>
      }
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
          <div className="divide-y divide-slate-100">
            {flows.map(flow => (
              <div key={flow.id} className="p-5 hover:bg-[var(--bg-subtle)] transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-slate-800 truncate">{flow.name}</h3>
                      {flow.active && (
                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full shrink-0">ACTIVE</span>
                      )}
                    </div>
                    {flow.description && <p className="text-xs text-slate-500 mb-2">{flow.description}</p>}
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>{flow.nodes.length} nodes</span>
                      <span>{flow.edges.length} connections</span>
                      <span>Updated {new Date(flow.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
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
                </div>
              </div>
            ))}
          </div>
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
