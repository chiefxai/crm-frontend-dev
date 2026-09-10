import React, { useState, useCallback, useRef } from 'react';
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

import { Plus, Trash2, Save, CheckCircle2, HelpCircle, Zap, GitBranch, Square, Variable, ChevronRight, ChevronLeft } from 'lucide-react';
import { QuestionFlow, QuestionFlowNode, QuestionFlowEdge, WorkflowVariable } from './types';
import { nodeTypes } from './components/FlowNodes';
import NodeEditor from './components/NodeEditor';
import WorkflowVariables from './components/WorkflowVariables';

function toRFNodes(nodes: QuestionFlowNode[]): Node[] {
  return nodes.map(n => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: { ...n },
    selected: false,
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

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

interface Props {
  flow: QuestionFlow;
  allFlows: QuestionFlow[];
  onChange: (updated: QuestionFlow) => void;
}

export default function QuestionFlowBuilder({ flow, allFlows, onChange }: Props) {
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(toRFNodes(flow.nodes));
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(toRFEdges(flow.edges));
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [varPanelOpen, setVarPanelOpen] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const handleVarsChange = (vars: WorkflowVariable[]) => {
    onChange({ ...flow, nodes: fromRFNodes(rfNodes), edges: fromRFEdges(rfEdges), variables: vars, updatedAt: new Date().toISOString() });
  };

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
    const newNode: QuestionFlowNode = {
      id,
      type,
      label: type === 'question' ? 'New Question' : type === 'action' ? 'New Action' : type === 'condition' ? 'Condition' : type === 'end' ? 'End' : 'Start',
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
    const updatedFlow: QuestionFlow = {
      ...flow,
      nodes: fromRFNodes(rfNodes),
      edges: fromRFEdges(rfEdges),
      updatedAt: new Date().toISOString(),
    };
    onChange(updatedFlow);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-slate-100 shrink-0 flex-wrap">
        <span className="text-xs font-semibold text-slate-500 mr-2">Add node:</span>
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
            saved
              ? 'bg-emerald-500 text-white'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {saved ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
          {saved ? 'Saved!' : 'Save Flow'}
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative" ref={reactFlowWrapper}>
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
          <MiniMap
            nodeStrokeWidth={3}
            className="!bottom-4 !right-4 border border-slate-200 rounded-xl"
          />
        </ReactFlow>

        {/* Node editor panel */}
        {selectedNode && (
          <>
            <div
              className="absolute inset-0 z-40"
              onClick={() => setSelectedNodeId(null)}
            />
            <NodeEditor
              node={selectedNode.data as QuestionFlowNode}
              allNodes={fromRFNodes(rfNodes)}
              onChange={onNodeEditorChange}
              onClose={() => setSelectedNodeId(null)}
            />
          </>
        )}

        {/* Variables sidebar */}
        {varPanelOpen && (
          <div className="absolute top-0 right-0 h-full w-80 bg-white border-l border-slate-200 shadow-xl z-20 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <Variable className="h-4 w-4 text-violet-600" />
                <span className="text-sm font-semibold text-slate-800">Variables</span>
              </div>
              <button
                onClick={() => setVarPanelOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <WorkflowVariables
                variables={flow.variables ?? []}
                onChange={handleVarsChange}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
