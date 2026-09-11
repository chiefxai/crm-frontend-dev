import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Plus, Trash2, Save, CheckCircle2, HelpCircle, Zap, GitBranch, Square, Variable, ChevronRight, Info } from 'lucide-react';
import { QuestionFlow, QuestionFlowNode, QuestionFlowEdge, WorkflowVariable } from './types';
import { nodeTypes } from './components/FlowNodes';
import NodeEditor from './components/NodeEditor';

// ── Auto-layout from variables ────────────────────────────────────────────────

const LEVEL_H = 150;
const BRANCH_OFFSET_X = 320;

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function layoutVariables(
  variables: WorkflowVariable[],
  spineX: number,
  startY: number,
  enterNodeId: string,
  exitNodeId: string | null,
): { nodes: QuestionFlowNode[]; edges: QuestionFlowEdge[]; height: number } {
  const nodes: QuestionFlowNode[] = [];
  const edges: QuestionFlowEdge[] = [];
  if (variables.length === 0) return { nodes, edges, height: startY };

  let currentY = startY;
  let prevNodeId = enterNodeId;

  variables.forEach((v, vIdx) => {
    const nodeId = `n-${v.id}`;
    nodes.push({
      id: nodeId,
      type: 'question',
      label: v.name || `Question ${vIdx + 1}`,
      questionText: v.questionText,
      position: { x: spineX, y: currentY },
    });
    edges.push({ id: uid('e'), source: prevNodeId, target: nodeId });

    const branches = v.branches ?? [];
    if (branches.length === 0) {
      currentY += LEVEL_H;
    } else {
      const branchStartY = currentY + LEVEL_H;
      const totalWidth = (branches.length - 1) * BRANCH_OFFSET_X;
      const leftmostX = spineX - totalWidth / 2;
      let maxBranchY = branchStartY;

      branches.forEach((branch, bIdx) => {
        const bX = leftmostX + bIdx * BRANCH_OFFSET_X;
        const nextVarId = variables[vIdx + 1]?.id;
        const nextNodeId = nextVarId ? `n-${nextVarId}` : exitNodeId;

        if (branch.variables.length > 0) {
          const sub = layoutVariables(branch.variables, bX, branchStartY, nodeId, nextNodeId);
          if (sub.edges.length > 0) {
            sub.edges[0] = { ...sub.edges[0], source: nodeId, label: branch.condition || `Branch ${bIdx + 1}` };
          }
          nodes.push(...sub.nodes);
          edges.push(...sub.edges);
          const lastSub = sub.nodes[sub.nodes.length - 1];
          if (lastSub && nextNodeId && !sub.edges.some(e => e.source === lastSub.id && e.target === nextNodeId)) {
            edges.push({ id: uid('e'), source: lastSub.id, target: nextNodeId });
          }
          maxBranchY = Math.max(maxBranchY, sub.height);
        } else if (nextNodeId) {
          edges.push({ id: uid('e'), source: nodeId, target: nextNodeId, label: branch.condition || `Branch ${bIdx + 1}` });
        }
      });

      currentY = maxBranchY + LEVEL_H;
    }

    prevNodeId = nodeId;
  });

  return { nodes, edges, height: currentY };
}

function variablesToNodes(variables: WorkflowVariable[]): { nodes: QuestionFlowNode[]; edges: QuestionFlowEdge[] } {
  const startId = 'auto-start';
  const endId = 'auto-end';
  if (variables.length === 0) {
    return {
      nodes: [
        { id: startId, type: 'start', label: 'Start', position: { x: 250, y: 50 } },
        { id: endId, type: 'end', label: 'End', position: { x: 250, y: 220 } },
      ],
      edges: [{ id: 'e-start-end', source: startId, target: endId }],
    };
  }

  const { nodes: qNodes, edges: qEdges, height } = layoutVariables(variables, 250, 180, startId, endId);
  const lastQ = qNodes.findLast?.(n => n.type === 'question') ?? qNodes[qNodes.length - 1];
  const extraEdges: QuestionFlowEdge[] = [];
  if (lastQ && !qEdges.some(e => e.source === lastQ.id && e.target === endId)) {
    extraEdges.push({ id: uid('e'), source: lastQ.id, target: endId });
  }

  return {
    nodes: [
      { id: startId, type: 'start', label: 'Start', position: { x: 250, y: 50 } },
      ...qNodes,
      { id: endId, type: 'end', label: 'End', position: { x: 250, y: height + 40 } },
    ],
    edges: [...qEdges, ...extraEdges],
  };
}

// ── ReactFlow adapters ────────────────────────────────────────────────────────

function toRFNodes(nodes: QuestionFlowNode[]): Node[] {
  return nodes.map(n => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: { ...n },
  }));
}

function toRFEdges(edges: QuestionFlowEdge[]): Edge[] {
  return edges.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.optionId,
    label: e.label,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
    style: { stroke: '#94a3b8', strokeWidth: 2 },
    labelStyle: { fontSize: 11, fill: '#64748b', fontWeight: 600 },
  }));
}

function fromRFNodes(rfNodes: Node[]): QuestionFlowNode[] {
  return rfNodes.map(n => ({ ...(n.data as QuestionFlowNode), position: n.position }));
}

function fromRFEdges(rfEdges: Edge[]): QuestionFlowEdge[] {
  return rfEdges.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    optionId: e.sourceHandle || undefined,
    label: e.label as string | undefined,
  }));
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  flow: QuestionFlow;
  allFlows: QuestionFlow[];
  onChange: (updated: QuestionFlow) => void;
}

export default function QuestionFlowBuilder({ flow, allFlows, onChange }: Props) {
  // If nodes are empty (cleared by variables tab), auto-generate from variables
  const initialNodes = useMemo(() => {
    const src = flow.nodes.length > 0 ? flow.nodes : variablesToNodes(flow.variables ?? []).nodes;
    return toRFNodes(src);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const initialEdges = useMemo(() => {
    const src = flow.nodes.length > 0 ? flow.edges : variablesToNodes(flow.variables ?? []).edges;
    return toRFEdges(src);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(initialNodes);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [varPanelOpen, setVarPanelOpen] = useState(false);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const flowIdRef = useRef(flow.id);
  const isMounted = useRef(false);

  // Re-initialize when switching to a different flow
  useEffect(() => {
    if (flow.id !== flowIdRef.current) {
      flowIdRef.current = flow.id;
      isMounted.current = false;
      const src = flow.nodes.length > 0 ? { nodes: flow.nodes, edges: flow.edges } : variablesToNodes(flow.variables ?? []);
      setRfNodes(toRFNodes(src.nodes));
      setRfEdges(toRFEdges(src.edges));
    }
  }, [flow.id, flow.nodes, flow.edges, flow.variables, setRfNodes, setRfEdges]);

  // Live-sync diagram edits back to parent
  useEffect(() => {
    if (!isMounted.current) { isMounted.current = true; return; }
    onChangeRef.current({
      ...flow,
      nodes: fromRFNodes(rfNodes),
      edges: fromRFEdges(rfEdges),
      updatedAt: new Date().toISOString(),
    });
  }, [rfNodes, rfEdges]); // eslint-disable-line react-hooks/exhaustive-deps

  // Delete selected node on keyboard Delete / Backspace
  useEffect(() => {
    if (!selectedNodeId) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') &&
          !(e.target instanceof HTMLInputElement) &&
          !(e.target instanceof HTMLTextAreaElement)) {
        deleteNode(selectedNodeId);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedNodeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedNode = rfNodes.find(n => n.id === selectedNodeId);

  const onConnect = useCallback(
    (connection: Connection) => {
      const edge: Edge = {
        ...connection,
        id: uid('e'),
        markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
        style: { stroke: '#94a3b8', strokeWidth: 2 },
      };
      setRfEdges(eds => addEdge(edge, eds));
    },
    [setRfEdges]
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => setSelectedNodeId(null), []);

  const addNode = (type: QuestionFlowNode['type']) => {
    const id = uid('n');
    const labels: Record<string, string> = { question: 'New Question', action: 'New Action', condition: 'Condition', end: 'End', start: 'Start' };
    const newNode: QuestionFlowNode = {
      id,
      type,
      label: labels[type] ?? type,
      questionText: type === 'question' ? 'What would you like to ask?' : undefined,
      options: type === 'question' ? [{ id: uid('opt'), text: 'Yes' }, { id: uid('opt'), text: 'No' }] : undefined,
      position: { x: 100 + rfNodes.length * 60, y: 100 + rfNodes.length * 40 },
    };
    setRfNodes(nds => [...nds, { id: newNode.id, type: newNode.type, position: newNode.position, data: { ...newNode } }]);
  };

  const deleteNode = (id: string) => {
    setRfNodes(nds => nds.filter(n => n.id !== id));
    setRfEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
    setSelectedNodeId(null);
  };

  const onNodeEditorChange = (updated: QuestionFlowNode) => {
    setRfNodes(nds =>
      nds.map(n => (n.id === updated.id ? { ...n, data: { ...updated }, type: updated.type } : n))
    );
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Info bar */}
      <div
        className="flex items-center gap-2 px-4 py-2 border-b shrink-0"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <Info className="h-3.5 w-3.5 shrink-0" style={{ color: '#6366f1' }} />
        <p className="text-xs flex-1" style={{ color: 'var(--text-muted)' }}>
          Diagram is auto-generated from Variables. You can also edit it directly here — drag nodes, add connections, or insert new nodes.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-slate-100 shrink-0 flex-wrap" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
        <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Add node:</span>
        <button
          onClick={() => addNode('question')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 border border-blue-200"
        >
          <HelpCircle className="h-3.5 w-3.5" /> Question
        </button>
        <button
          onClick={() => addNode('condition')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 border border-amber-200"
        >
          <GitBranch className="h-3.5 w-3.5" /> Condition
        </button>
        <button
          onClick={() => addNode('action')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-violet-50 text-violet-700 rounded-lg hover:bg-violet-100 border border-violet-200"
        >
          <Zap className="h-3.5 w-3.5" /> Action
        </button>
        <button
          onClick={() => addNode('end')}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-50 text-slate-700 rounded-lg hover:bg-slate-100 border border-slate-200"
        >
          <Square className="h-3.5 w-3.5" /> End
        </button>

        <div className="flex-1" />

        {selectedNode && (
          <button
            onClick={() => deleteNode(selectedNode.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 border border-rose-200"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete selected
          </button>
        )}

        <button
          onClick={() => setVarPanelOpen(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
            varPanelOpen
              ? 'bg-violet-600 text-white border-violet-600'
              : 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100'
          }`}
        >
          <Variable className="h-3.5 w-3.5" />
          Variables
          {(flow.variables ?? []).length > 0 && (
            <span className={`text-[10px] font-bold px-1.5 rounded-full ${varPanelOpen ? 'bg-white/20 text-white' : 'bg-violet-100 text-violet-700'}`}>
              {(flow.variables ?? []).length}
            </span>
          )}
        </button>

        <button
          onClick={handleSave}
          className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            saved ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {saved ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
          {saved ? 'Saved!' : 'Save Flow'}
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          snapToGrid
          snapGrid={[16, 16]}
          deleteKeyCode="Delete"
          className="bg-slate-50"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
          <Controls className="!bottom-4 !left-4" />
          <MiniMap nodeStrokeWidth={3} className="!bottom-4 !right-4 border border-slate-200 rounded-xl" />
        </ReactFlow>

        {/* Node editor panel */}
        {selectedNode && (
          <>
            <div className="absolute inset-0 z-40" onClick={() => setSelectedNodeId(null)} />
            <NodeEditor
              node={selectedNode.data as QuestionFlowNode}
              allNodes={fromRFNodes(rfNodes)}
              onChange={onNodeEditorChange}
              onClose={() => setSelectedNodeId(null)}
            />
          </>
        )}

        {/* Variables quick-view sidebar */}
        {varPanelOpen && (
          <div className="absolute top-0 right-0 h-full w-72 border-l shadow-xl z-20 flex flex-col overflow-hidden" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <Variable className="h-4 w-4 text-violet-600" />
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Variables</span>
              </div>
              <button
                onClick={() => setVarPanelOpen(false)}
                className="p-1 rounded-lg transition-colors hover:bg-[var(--bg-subtle)]"
                style={{ color: 'var(--text-muted)' }}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {(flow.variables ?? []).length === 0 ? (
                <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>No variables defined. Switch to the Variables tab to add questions.</p>
              ) : (
                (flow.variables ?? []).map((v, i) => (
                  <div key={v.id} className="rounded-xl p-3 border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="h-5 w-5 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0">{i + 1}</span>
                      <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{v.name || '(unnamed)'}</span>
                    </div>
                    {v.questionText && <p className="text-[11px] pl-7" style={{ color: 'var(--text-muted)' }}>{v.questionText}</p>}
                    {(v.branches ?? []).length > 0 && (
                      <p className="text-[10px] pl-7 mt-0.5 font-medium text-amber-600">{v.branches!.length} branch{v.branches!.length > 1 ? 'es' : ''}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
