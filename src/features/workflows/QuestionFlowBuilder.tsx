import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Edge,
  Node,
  BackgroundVariant,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { Info } from 'lucide-react';
import { QuestionFlow, QuestionFlowNode, QuestionFlowEdge, WorkflowVariable } from './types';
import { nodeTypes } from './components/FlowNodes';

// ── Layout constants ──────────────────────────────────────────────────────────
const NODE_W = 260;
const LEVEL_H = 150;
const BRANCH_OFFSET_X = 320; // horizontal distance from spine per branch column

// ── Build diagram from variables (read-only auto-layout) ──────────────────────

interface BuiltNode extends QuestionFlowNode {
  _col?: number; // column index (0 = spine)
}

interface Layout {
  nodes: BuiltNode[];
  edges: QuestionFlowEdge[];
  /** total y-height consumed (so callers know where to resume the spine) */
  height: number;
}

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Recursively lay out a list of variables starting at (x, y).
 * Returns nodes and edges for this sub-tree, and the final y-position
 * the spine should continue from after this group.
 */
function layoutVariables(
  variables: WorkflowVariable[],
  spineX: number,
  startY: number,
  enterNodeId: string,       // node to draw edge from into first variable
  exitNodeId: string | null, // node to draw edge into after last variable (null = no exit edge here)
): Layout {
  const nodes: BuiltNode[] = [];
  const edges: QuestionFlowEdge[] = [];

  if (variables.length === 0) return { nodes, edges, height: startY };

  let currentY = startY;
  let prevNodeId = enterNodeId;

  variables.forEach((v, vIdx) => {
    const nodeId = `n-${v.id}`;
    const qNode: BuiltNode = {
      id: nodeId,
      type: 'question',
      label: v.name || `Question ${vIdx + 1}`,
      questionText: v.questionText,
      position: { x: spineX, y: currentY },
    };
    nodes.push(qNode);

    // Edge from previous → this question
    edges.push({
      id: uid('e'),
      source: prevNodeId,
      target: nodeId,
      label: undefined,
    });

    const branches = v.branches ?? [];
    if (branches.length === 0) {
      // No branches — simple linear step
      currentY += LEVEL_H;
    } else {
      // Has branches — fork out, lay each branch sub-tree, then merge
      const branchStartY = currentY + LEVEL_H;
      const branchCount = branches.length;

      // Spread branches symmetrically around the spine
      const totalWidth = (branchCount - 1) * BRANCH_OFFSET_X;
      const leftmostX = spineX - totalWidth / 2;

      // For each branch: build sub-layout
      type BranchResult = { sub: Layout; mergeNodeId: string | null; branchNodeId: string };
      const branchResults: BranchResult[] = [];

      let maxBranchY = branchStartY;

      branches.forEach((branch, bIdx) => {
        const bX = leftmostX + bIdx * BRANCH_OFFSET_X;

        // Build sub-layout for the branch's questions
        // We use a dummy enter-id; we'll emit the edge from the main question
        if (branch.variables.length > 0) {
          const sub = layoutVariables(branch.variables, bX, branchStartY, nodeId, null);
          // Override the first edge's source to emit from the main question with label
          if (sub.edges.length > 0) {
            sub.edges[0] = { ...sub.edges[0], source: nodeId, label: branch.condition || `Branch ${bIdx + 1}` };
          }
          nodes.push(...sub.nodes);
          edges.push(...sub.edges);

          // The last sub-node is the merge point
          const lastSubNode = sub.nodes[sub.nodes.length - 1];
          branchResults.push({ sub, mergeNodeId: lastSubNode?.id ?? null, branchNodeId: nodeId });
          maxBranchY = Math.max(maxBranchY, sub.height);
        } else {
          // Empty branch: just a label edge with no sub-nodes
          branchResults.push({ sub: { nodes: [], edges: [], height: branchStartY }, mergeNodeId: null, branchNodeId: nodeId });
          // Emit a labeled edge that goes directly to the merge node (added below after we know it)
        }
      });

      // The merge node is the NEXT spine question (or the exit node).
      // We don't know the next node ID yet — we'll create a "rejoin" phantom node
      // or simply let the merge edges dangle (they'll be connected when the next
      // iteration creates its node). To solve this cleanly, we create the next node
      // id in advance if there is one.
      const nextVarId = variables[vIdx + 1]?.id;
      const nextNodeId = nextVarId ? `n-${nextVarId}` : exitNodeId;

      if (nextNodeId) {
        branchResults.forEach((br, bIdx) => {
          if (br.mergeNodeId) {
            edges.push({ id: uid('e'), source: br.mergeNodeId, target: nextNodeId });
          } else {
            // Empty branch — direct edge from main question to next
            edges.push({
              id: uid('e'),
              source: nodeId,
              target: nextNodeId,
              label: branches[bIdx]?.condition || `Branch ${bIdx + 1}`,
            });
          }
        });
      }

      currentY = maxBranchY + LEVEL_H;
    }

    prevNodeId = nodeId;
  });

  return { nodes, edges, height: currentY };
}

function variablesToFlow(variables: WorkflowVariable[]): { nodes: QuestionFlowNode[]; edges: QuestionFlowEdge[] } {
  if (variables.length === 0) {
    // Just start → end
    const startId = 'auto-start';
    const endId = 'auto-end';
    return {
      nodes: [
        { id: startId, type: 'start', label: 'Start', position: { x: 250, y: 50 } },
        { id: endId,   type: 'end',   label: 'End',   position: { x: 250, y: 220 } },
      ],
      edges: [{ id: 'e-start-end', source: startId, target: endId }],
    };
  }

  const startId = 'auto-start';
  const endId   = 'auto-end';
  const spineX  = 250;
  const startY  = 180;

  const { nodes: qNodes, edges: qEdges, height } = layoutVariables(
    variables,
    spineX,
    startY,
    startId,
    endId,
  );

  // Last question → end edge (if not already wired by branch merge)
  const lastQNode = qNodes.findLast?.(n => n.type === 'question') ?? qNodes[qNodes.length - 1];
  const alreadyWired = lastQNode && qEdges.some(e => e.source === lastQNode.id && e.target === endId);

  const extraEdges: QuestionFlowEdge[] = [];
  if (lastQNode && !alreadyWired) {
    extraEdges.push({ id: uid('e'), source: lastQNode.id, target: endId });
  }

  const allNodes: QuestionFlowNode[] = [
    { id: startId, type: 'start', label: 'Start', position: { x: spineX, y: 50 } },
    ...qNodes,
    { id: endId, type: 'end', label: 'End', position: { x: spineX, y: height + 40 } },
  ];

  return { nodes: allNodes, edges: [...qEdges, ...extraEdges] };
}

// ── ReactFlow adapters ────────────────────────────────────────────────────────

function toRFNodes(nodes: QuestionFlowNode[]): Node[] {
  return nodes.map(n => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: { ...n },
    selectable: false,
    draggable: false,
  }));
}

function toRFEdges(edges: QuestionFlowEdge[]): Edge[] {
  return edges.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' },
    style: { stroke: '#94a3b8', strokeWidth: 2 },
    labelStyle: { fontSize: 11, fill: '#64748b', fontWeight: 600 },
  }));
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  flow: QuestionFlow;
  allFlows: QuestionFlow[];
  onChange: (updated: QuestionFlow) => void;
}

export default function QuestionFlowBuilder({ flow }: Props) {
  const { nodes: autoNodes, edges: autoEdges } = useMemo(
    () => variablesToFlow(flow.variables ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(flow.variables)],
  );

  const rfNodes = useMemo(() => toRFNodes(autoNodes), [autoNodes]);
  const rfEdges = useMemo(() => toRFEdges(autoEdges), [autoEdges]);

  return (
    <div className="flex flex-col h-full">
      {/* Info bar */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 border-b shrink-0"
        style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}
      >
        <Info className="h-4 w-4 shrink-0" style={{ color: '#6366f1' }} />
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          Diagram is auto-generated from your <strong>Variables</strong> tab. Switch to Variables to add or edit questions and branches.
        </p>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          nodesConnectable={false}
          elementsSelectable={false}
          zoomOnDoubleClick={false}
          className="bg-slate-50"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
          <Controls className="!bottom-4 !left-4" showInteractive={false} />
          <MiniMap
            nodeStrokeWidth={3}
            className="!bottom-4 !right-4 border border-slate-200 rounded-xl"
          />
        </ReactFlow>

        {(flow.variables ?? []).length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="text-center px-6 py-8 rounded-2xl"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            >
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No questions defined yet</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Switch to the <strong>Variables</strong> tab and add questions to see the flow diagram.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
