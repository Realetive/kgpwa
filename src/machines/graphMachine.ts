import {
  setup,
  fromPromise,
  assign,
  type Actor,
  type SnapshotFrom,
} from 'xstate';
import type { KGGraph, KGNode, KGEdge, NodeId } from '../types/kg';
import type { KgDb } from '../persistence/db';
import type { PersistedSnapshot } from '../types/persistence';
import { saveSnapshot, createEmptySnapshot } from '../persistence/snapshots';
import {
  saveHistoryEntry,
  pruneHistory,
  createHistoryEntry,
} from '../persistence/history';

// ─── Types ───────────────────────────────────────────────────────────────────

const MAX_UNDO = 50;

export interface GraphContext {
  graph: KGGraph;
  selectedNodeId: NodeId | null;
  undoStack: KGGraph[];
  redoStack: KGGraph[];
  isDirty: boolean;
  db: KgDb | null;
  snapshotId: string | null;
  lastSavedAt: number;
}

export type GraphEvent =
  | { type: 'HYDRATE'; snapshot: PersistedSnapshot; db: KgDb }
  | { type: 'ADD_NODE'; node: Omit<KGNode, 'id' | 'createdAt' | 'updatedAt'> }
  | { type: 'REMOVE_NODE'; id: NodeId }
  | {
      type: 'UPDATE_NODE';
      id: NodeId;
      patch: Partial<Omit<KGNode, 'id' | 'createdAt' | 'updatedAt'>>;
    }
  | { type: 'ADD_EDGE'; edge: Omit<KGEdge, 'id' | 'createdAt'> }
  | { type: 'REMOVE_EDGE'; id: string }
  | { type: 'SELECT_NODE'; id: NodeId | null }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SAVE_COMPLETED' };

export type GraphMachineSnapshot = SnapshotFrom<typeof graphMachine>;
export type GraphActor = Actor<typeof graphMachine>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cloneGraph(graph: KGGraph): KGGraph {
  return structuredClone(graph);
}

function generateId(): string {
  return crypto.randomUUID();
}

function pushUndo(ctx: GraphContext, actionType: string): GraphContext {
  const newUndo = [...ctx.undoStack, cloneGraph(ctx.graph)];
  if (newUndo.length > MAX_UNDO) {
    newUndo.shift();
  }
  return { ...ctx, undoStack: newUndo, redoStack: [], isDirty: true };
}

// ─── Machine ─────────────────────────────────────────────────────────────────

export const graphMachine = setup({
  types: {
    context: {} as GraphContext,
    events: {} as GraphEvent,
  },
  actors: {
    persistSnapshot: fromPromise(
      async ({ input }: { input: { graph: KGGraph; db: KgDb; snapshotId: string } }): Promise<string> => {
        const snapshot: PersistedSnapshot = {
          id: input.snapshotId || crypto.randomUUID(),
          version: 1,
          savedAt: Date.now(),
          route: window.location.pathname,
          selectedNodeId: null,
          graph: cloneGraph(input.graph),
          viewState: {
            zoom: 1,
            center: { x: 0, y: 0 },
          },
        };
        await saveSnapshot(input.db, snapshot);
        return snapshot.id;
      },
    ),
    persistHistory: fromPromise(
      async ({
        input,
      }: {
        input: { db: KgDb; snapshotId: string; actionType: string; graph: KGGraph };
      }): Promise<void> => {
        const entry = createHistoryEntry(
          input.snapshotId,
          input.actionType,
          input.graph,
        );
        await saveHistoryEntry(input.db, entry);
        await pruneHistory(input.db, MAX_UNDO);
      },
    ),
  },
  actions: {
    hydrateGraph: assign({
      graph: ({ event }) => {
        const e = event as any;
        return cloneGraph(e.snapshot.graph);
      },
      db: ({ event }) => {
        const e = event as any;
        return e.db;
      },
      snapshotId: ({ event }) => {
        const e = event as any;
        return e.snapshot.id;
      },
      undoStack: () => [],
      redoStack: () => [],
      isDirty: () => false,
      lastSavedAt: () => Date.now(),
    }),

    addNode: assign(({ context, event }) => {
      const e = event as any; // node, 'id' | 'createdAt' | 'updatedAt'> };
      const now = Date.now();
      const id = generateId();
      const node: KGNode = {
        id,
        label: e.node.label,
        type: e.node.type,
        properties: { ...e.node.properties },
        createdAt: now,
        updatedAt: now,
      };
      const ctx = pushUndo(context, 'ADD_NODE');
      return {
        ...ctx,
        graph: {
          ...ctx.graph,
          nodes: { ...ctx.graph.nodes, [id]: node },
        },
      };
    }),

    removeNode: assign(({ context, event }) => {
      const e = event as any;
      const newNodes = { ...context.graph.nodes };
      delete newNodes[e.id];
      // also remove edges connected to this node
      const newEdges: Record<string, KGEdge> = {};
      for (const [key, edge] of Object.entries(context.graph.edges)) {
        if (edge.source !== e.id && edge.target !== e.id) {
          newEdges[key] = edge;
        }
      }
      const ctx = pushUndo(context, 'REMOVE_NODE');
      return {
        ...ctx,
        graph: { ...ctx.graph, nodes: newNodes, edges: newEdges },
        selectedNodeId:
          context.selectedNodeId === e.id ? null : context.selectedNodeId,
      };
    }),

    updateNode: assign(({ context, event }) => {
      const e = event as {
        id: NodeId;
        patch: Partial<Omit<KGNode, 'id' | 'createdAt' | 'updatedAt'>>;
      };
      const existing = context.graph.nodes[e.id];
      if (!existing) return context;
      const updated: KGNode = {
        ...existing,
        ...e.patch,
        properties: {
          ...existing.properties,
          ...(e.patch.properties ?? {}),
        },
        updatedAt: Date.now(),
      };
      const ctx = pushUndo(context, 'UPDATE_NODE');
      return {
        ...ctx,
        graph: {
          ...ctx.graph,
          nodes: { ...ctx.graph.nodes, [e.id]: updated },
        },
      };
    }),

    addEdge: assign(({ context, event }) => {
      const e = event as any; // edge, 'id' | 'createdAt'> };
      const now = Date.now();
      const id = generateId();
      const edge: KGEdge = {
        id,
        source: e.edge.source,
        target: e.edge.target,
        predicate: e.edge.predicate,
        weight: e.edge.weight,
        createdAt: now,
      };
      const ctx = pushUndo(context, 'ADD_EDGE');
      return {
        ...ctx,
        graph: {
          ...ctx.graph,
          edges: { ...ctx.graph.edges, [id]: edge },
        },
      };
    }),

    removeEdge: assign(({ context, event }) => {
      const e = event as any;
      const newEdges = { ...context.graph.edges };
      delete newEdges[e.id];
      const ctx = pushUndo(context, 'REMOVE_EDGE');
      return {
        ...ctx,
        graph: { ...ctx.graph, edges: newEdges },
      };
    }),

    selectNode: assign({
      selectedNodeId: ({ event }) => {
        const e = event as any;
        return e.id;
      },
    }),

    undo: assign(({ context }) => {
      if (context.undoStack.length === 0) return context;
      const prev = context.undoStack[context.undoStack.length - 1]!;
      return {
        ...context,
        redoStack: [...context.redoStack, cloneGraph(context.graph)],
        undoStack: context.undoStack.slice(0, -1),
        graph: cloneGraph(prev),
        isDirty: true,
      };
    }),

    redo: assign(({ context }) => {
      if (context.redoStack.length === 0) return context;
      const next = context.redoStack[context.redoStack.length - 1]!;
      return {
        ...context,
        undoStack: [...context.undoStack, cloneGraph(context.graph)],
        redoStack: context.redoStack.slice(0, -1),
        graph: cloneGraph(next),
        isDirty: true,
      };
    }),

    markSaved: assign({
      isDirty: false,
      lastSavedAt: () => Date.now(),
      snapshotId: ({ event }) => {
        const e = event as any;
        return e.output;
      },
    }),
  },
}).createMachine({
  id: 'graph',
  initial: 'idle',

  context: {
    graph: createEmptySnapshot().graph,
    selectedNodeId: null,
    undoStack: [],
    redoStack: [],
    isDirty: false,
    db: null,
    snapshotId: null,
    lastSavedAt: 0,
  },

  states: {
    idle: {
      on: {
        HYDRATE: {
          actions: 'hydrateGraph',
          target: 'idle',
        },
        ADD_NODE: {
          actions: 'addNode',
          target: 'idle',
        },
        REMOVE_NODE: {
          actions: 'removeNode',
          target: 'idle',
        },
        UPDATE_NODE: {
          actions: 'updateNode',
          target: 'idle',
        },
        ADD_EDGE: {
          actions: 'addEdge',
          target: 'idle',
        },
        REMOVE_EDGE: {
          actions: 'removeEdge',
          target: 'idle',
        },
        SELECT_NODE: {
          actions: 'selectNode',
          target: 'idle',
        },
        UNDO: {
          actions: 'undo',
          target: 'idle',
        },
        REDO: {
          actions: 'redo',
          target: 'idle',
        },
      },
      after: {
        500: {
          target: 'saving',
          guard: ({ context }) =>
            context.isDirty && context.db !== null && context.snapshotId !== null,
        },
      },
    },
    saving: {
      invoke: {
        src: 'persistSnapshot',
        input: ({ context }) => ({
          graph: context.graph,
          db: context.db as KgDb,
          snapshotId: context.snapshotId ?? '',
        }),
        onDone: {
          target: 'idle',
          actions: 'markSaved',
        },
        onError: {
          target: 'idle',
        },
      },
    },
  },
});
