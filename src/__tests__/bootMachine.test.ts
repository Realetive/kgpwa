import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createActor } from 'xstate';
import { bootMachine } from '../machines/bootMachine';
import type { PersistedSnapshot } from '../types/persistence';

// Mock persistence layer
vi.mock('../persistence/db', () => ({
  openAppDb: vi.fn(),
}));

vi.mock('../persistence/snapshots', () => ({
  loadLastSnapshot: vi.fn(),
  createEmptySnapshot: vi.fn(),
}));

vi.mock('../persistence/seed', () => ({
  seedDemoIfEmpty: vi.fn(),
}));

import { openAppDb } from '../persistence/db';
import { loadLastSnapshot, createEmptySnapshot } from '../persistence/snapshots';
import { seedDemoIfEmpty } from '../persistence/seed';

const mockOpenAppDb = openAppDb as ReturnType<typeof vi.fn>;
const mockLoadLastSnapshot = loadLastSnapshot as ReturnType<typeof vi.fn>;
const mockCreateEmptySnapshot = createEmptySnapshot as ReturnType<typeof vi.fn>;
const mockSeedDemoIfEmpty = seedDemoIfEmpty as ReturnType<typeof vi.fn>;

function makeEmptyMock(): PersistedSnapshot {
  return {
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
    viewState: {
      zoom: 1,
      center: { x: 0, y: 0 },
    },
  };
}

function makePopulatedMock(): PersistedSnapshot {
  return {
    id: 'populated-snap',
    version: 1,
    savedAt: Date.now(),
    route: '/',
    selectedNodeId: 'node-1',
    graph: {
      nodes: {
        'node-1': {
          id: 'node-1',
          label: 'Test Node',
          type: 'Concept',
          properties: {},
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      },
      edges: {},
      meta: {
        baseIRI: 'https://kg.local/',
        version: 1,
        title: 'Test Graph',
      },
    },
    viewState: {
      zoom: 1,
      center: { x: 0, y: 0 },
    },
  };
}

describe('bootMachine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should go from cold → ready when snapshot exists', async () => {
    const mockDb = { close: vi.fn() };
    const mockSnapshot = makePopulatedMock();

    mockOpenAppDb.mockResolvedValue(mockDb);
    mockLoadLastSnapshot.mockResolvedValue(mockSnapshot);

    const actor = createActor(bootMachine);
    actor.start();

    await vi.waitFor(
      () => {
        const snap = actor.getSnapshot();
        expect(snap.value).toBe('ready');
      },
      { timeout: 5000 },
    );

    const finalSnap = actor.getSnapshot();
    expect(finalSnap.context.db).toBe(mockDb);
    expect(finalSnap.context.snapshot).toEqual(mockSnapshot);
    expect(finalSnap.context.errorMessage).toBeNull();
    // seedDemoIfEmpty should NOT be called when snapshot exists
    expect(mockSeedDemoIfEmpty).not.toHaveBeenCalled();
  });

  it('should go from cold → seeding → ready when no snapshot (seeds demo)', async () => {
    const mockDb = { close: vi.fn() };
    const mockEmptySnapshot = makeEmptyMock();
    const mockSeededSnapshot = makePopulatedMock();

    mockOpenAppDb.mockResolvedValue(mockDb);
    mockLoadLastSnapshot.mockResolvedValue(null);
    mockCreateEmptySnapshot.mockReturnValue(mockEmptySnapshot);
    mockSeedDemoIfEmpty.mockResolvedValue(mockSeededSnapshot);

    const actor = createActor(bootMachine);
    actor.start();

    // Should pass through seeding then reach ready
    await vi.waitFor(
      () => {
        const snap = actor.getSnapshot();
        expect(snap.value).toBe('ready');
      },
      { timeout: 5000 },
    );

    const finalSnap = actor.getSnapshot();
    expect(finalSnap.context.db).toBe(mockDb);
    expect(finalSnap.context.snapshot).toEqual(mockSeededSnapshot);
    expect(finalSnap.context.errorMessage).toBeNull();
    expect(mockSeedDemoIfEmpty).toHaveBeenCalledWith(mockDb);
  });

  it('should go to ready even when seeding fails (graceful degradation)', async () => {
    const mockDb = { close: vi.fn() };
    const mockEmptySnapshot = makeEmptyMock();

    mockOpenAppDb.mockResolvedValue(mockDb);
    mockLoadLastSnapshot.mockResolvedValue(null);
    mockCreateEmptySnapshot.mockReturnValue(mockEmptySnapshot);
    mockSeedDemoIfEmpty.mockRejectedValue(new Error('Seed failed'));

    const actor = createActor(bootMachine);
    actor.start();

    await vi.waitFor(
      () => {
        const snap = actor.getSnapshot();
        expect(snap.value).toBe('ready');
      },
      { timeout: 5000 },
    );

    const finalSnap = actor.getSnapshot();
    expect(finalSnap.context.db).toBe(mockDb);
    // Should keep empty snapshot as fallback
    expect(finalSnap.context.snapshot).toEqual(mockEmptySnapshot);
    expect(mockSeedDemoIfEmpty).toHaveBeenCalled();
  });

  it('should go to error state when openDb fails', async () => {
    mockOpenAppDb.mockRejectedValue(new Error('DB open failed'));

    const actor = createActor(bootMachine);
    actor.start();

    await vi.waitFor(
      () => {
        const snap = actor.getSnapshot();
        expect(snap.value).toBe('error');
      },
      { timeout: 5000 },
    );

    const finalSnap = actor.getSnapshot();
    expect(finalSnap.context.errorMessage).toBe('DB open failed');
  });

  it('should retry when RETRY event is sent in error state', async () => {
    const mockDb = { close: vi.fn() };
    const mockSnapshot = makePopulatedMock();

    // First call fails
    mockOpenAppDb.mockRejectedValueOnce(new Error('First fail'));
    // Second call succeeds
    mockOpenAppDb.mockResolvedValueOnce(mockDb);
    mockLoadLastSnapshot.mockResolvedValue(mockSnapshot);

    const actor = createActor(bootMachine);
    actor.start();

    // Should go to error
    await vi.waitFor(
      () => {
        const snap = actor.getSnapshot();
        expect(snap.value).toBe('error');
      },
      { timeout: 5000 },
    );

    // Send RETRY
    actor.send({ type: 'RETRY' });

    // Should eventually reach ready
    await vi.waitFor(
      () => {
        const snap = actor.getSnapshot();
        expect(snap.value).toBe('ready');
      },
      { timeout: 5000 },
    );

    const finalSnap = actor.getSnapshot();
    expect(finalSnap.context.db).toBe(mockDb);
    expect(finalSnap.context.snapshot).toEqual(mockSnapshot);
  });

  it('should handle corrupt snapshot gracefully (seeds demo)', async () => {
    const mockDb = { close: vi.fn() };
    const mockEmptySnapshot = makeEmptyMock();
    const mockSeededSnapshot = makePopulatedMock();

    mockOpenAppDb.mockResolvedValue(mockDb);
    // loadLastSnapshot returns null on corrupt data
    mockLoadLastSnapshot.mockResolvedValue(null);
    mockCreateEmptySnapshot.mockReturnValue(mockEmptySnapshot);
    mockSeedDemoIfEmpty.mockResolvedValue(mockSeededSnapshot);

    const actor = createActor(bootMachine);
    actor.start();

    await vi.waitFor(
      () => {
        const snap = actor.getSnapshot();
        expect(snap.value).toBe('ready');
      },
      { timeout: 5000 },
    );

    const finalSnap = actor.getSnapshot();
    expect(finalSnap.context.snapshot).toEqual(mockSeededSnapshot);
    expect(mockSeedDemoIfEmpty).toHaveBeenCalled();
  });
});
