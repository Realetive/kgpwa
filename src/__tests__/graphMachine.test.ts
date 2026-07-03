import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createActor } from 'xstate';
import { graphMachine } from '../machines/graphMachine';

vi.mock('../persistence/snapshots', () => ({
  saveSnapshot: vi.fn(),
  createEmptySnapshot: vi.fn(() => ({
    id: 'empty-snap',
    version: 1,
    savedAt: Date.now(),
    route: '/',
    selectedNodeId: null,
    graph: {
      nodes: {},
      edges: {},
      meta: {
        baseIRI: 'https://kg.local/',
        version: 1,
        title: 'Test Graph',
      },
    },
    viewState: { zoom: 1, center: { x: 0, y: 0 } },
  })),
}));

vi.mock('../persistence/history', () => ({
  saveHistoryEntry: vi.fn(),
  pruneHistory: vi.fn(),
  createHistoryEntry: vi.fn(() => ({
    id: 'hist-1',
    snapshotId: 'snap-1',
    actionType: 'ADD_NODE',
    timestamp: Date.now(),
    graph: {
      nodes: {},
      edges: {},
      meta: {
        baseIRI: 'https://kg.local/',
        version: 1,
        title: 'Test Graph',
      },
    },
  })),
}));

import { saveSnapshot } from '../persistence/snapshots';

describe('graphMachine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should hydrate from a snapshot', () => {
    const mockDb = { close: vi.fn() };

    const actor = createActor(graphMachine);
    actor.start();

    actor.send({
      type: 'HYDRATE',
      snapshot: {
        id: 'snap-1',
        version: 1,
        savedAt: Date.now(),
        route: '/',
        selectedNodeId: null,
        graph: {
          nodes: {},
          edges: {},
          meta: {
            baseIRI: 'https://kg.local/',
            version: 1,
            title: 'Test Graph',
          },
        },
        viewState: { zoom: 1, center: { x: 0, y: 0 } },
      },
      db: mockDb as any,
    });

    const state = actor.getSnapshot();
    expect(state.context.db).toBe(mockDb);
    expect(state.context.snapshotId).toBe('snap-1');
  });

  it('should add a node and push to undo stack', () => {
    const actor = createActor(graphMachine);
    actor.start();

    actor.send({
      type: 'ADD_NODE',
      node: {
        label: 'New Concept',
        type: 'Concept',
        properties: { key: 'value' },
      },
    });

    const state = actor.getSnapshot();
    const nodes = Object.values(state.context.graph.nodes);

    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.label).toBe('New Concept');
    expect(nodes[0]?.type).toBe('Concept');
    expect(nodes[0]?.properties).toEqual({ key: 'value' });
    expect(state.context.undoStack).toHaveLength(1);
    expect(state.context.redoStack).toHaveLength(0);
    expect(state.context.isDirty).toBe(true);
  });

  it('should undo an ADD_NODE and restore previous graph', () => {
    const actor = createActor(graphMachine);
    actor.start();

    actor.send({
      type: 'ADD_NODE',
      node: { label: 'To Undo', type: 'Entity', properties: {} },
    });

    let state = actor.getSnapshot();
    expect(Object.keys(state.context.graph.nodes)).toHaveLength(1);

    actor.send({ type: 'UNDO' });

    state = actor.getSnapshot();
    expect(Object.keys(state.context.graph.nodes)).toHaveLength(0);
    expect(state.context.undoStack).toHaveLength(0);
    expect(state.context.redoStack).toHaveLength(1);
  });

  it('should redo after undo', () => {
    const actor = createActor(graphMachine);
    actor.start();

    actor.send({
      type: 'ADD_NODE',
      node: { label: 'Redo Test', type: 'Concept', properties: {} },
    });

    actor.send({ type: 'UNDO' });
    actor.send({ type: 'REDO' });

    const state = actor.getSnapshot();
    const nodes = Object.values(state.context.graph.nodes);
    expect(nodes).toHaveLength(1);
    expect(nodes[0]?.label).toBe('Redo Test');
  });

  it('should clear redo stack on new mutation', () => {
    const actor = createActor(graphMachine);
    actor.start();

    actor.send({
      type: 'ADD_NODE',
      node: { label: 'Node 1', type: 'Concept', properties: {} },
    });

    actor.send({ type: 'UNDO' });

    actor.send({
      type: 'ADD_NODE',
      node: { label: 'Node 2', type: 'Entity', properties: {} },
    });

    const state = actor.getSnapshot();
    expect(state.context.redoStack).toHaveLength(0);
  });

  it('should remove a node and its connected edges', () => {
    const actor = createActor(graphMachine);
    actor.start();

    actor.send({
      type: 'ADD_NODE',
      node: { label: 'Source', type: 'Concept', properties: {} },
    });

    const state1 = actor.getSnapshot();
    const sourceId = Object.keys(state1.context.graph.nodes)[0]!;

    actor.send({
      type: 'ADD_NODE',
      node: { label: 'Target', type: 'Entity', properties: {} },
    });

    const state2 = actor.getSnapshot();
    const targetId = Object.keys(state2.context.graph.nodes).find(
      (k) => k !== sourceId,
    )!;

    actor.send({
      type: 'ADD_EDGE',
      edge: {
        source: sourceId,
        target: targetId,
        predicate: 'relatedTo',
        weight: 1,
      },
    });

    const state3 = actor.getSnapshot();
    expect(Object.keys(state3.context.graph.edges)).toHaveLength(1);

    actor.send({ type: 'REMOVE_NODE', id: sourceId });

    const state4 = actor.getSnapshot();
    expect(Object.keys(state4.context.graph.nodes)).toHaveLength(1);
    expect(Object.keys(state4.context.graph.edges)).toHaveLength(0);
  });
});
