import type { GraphMachineSnapshot, GraphContext } from './graphMachine';
import type { KGGraph, KGNode, KGEdge, NodeId } from '../types/kg';

// ─── Atomic selectors for graphMachine ───────────────────────────────────────

export const selectGraph = (snap: GraphMachineSnapshot): KGGraph =>
  snap.context.graph;

export const selectNodes = (snap: GraphMachineSnapshot): Record<NodeId, KGNode> =>
  snap.context.graph.nodes;

export const selectEdges = (snap: GraphMachineSnapshot): Record<string, KGEdge> =>
  snap.context.graph.edges;

export const selectSelectedNodeId = (snap: GraphMachineSnapshot): NodeId | null =>
  snap.context.selectedNodeId;

export const selectUndoCount = (snap: GraphMachineSnapshot): number =>
  snap.context.undoStack.length;

export const selectRedoCount = (snap: GraphMachineSnapshot): number =>
  snap.context.redoStack.length;

export const selectIsDirty = (snap: GraphMachineSnapshot): boolean =>
  snap.context.isDirty;

export const selectLastSavedAt = (snap: GraphMachineSnapshot): number =>
  snap.context.lastSavedAt;

// ─── Legacy composite selector (backward compat) ─────────────────────────────

export interface GraphState {
  graph: KGGraph;
  selectedNodeId: NodeId | null;
  undoStack: KGGraph[];
  redoStack: KGGraph[];
  isDirty: boolean;
  lastSavedAt: number;
}

export const selectGraphState = (snap: GraphMachineSnapshot): GraphState => {
  const ctx = snap.context;
  return {
    graph: ctx.graph,
    selectedNodeId: ctx.selectedNodeId,
    undoStack: ctx.undoStack,
    redoStack: ctx.redoStack,
    isDirty: ctx.isDirty,
    lastSavedAt: ctx.lastSavedAt,
  };
};
