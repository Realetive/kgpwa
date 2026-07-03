import type { KgDb } from '../persistence/db';
import type { PersistedSnapshot } from '../types/persistence';

const debugLog = (...args: unknown[]) => { if (import.meta.env.DEV) console.log(...args); };

const EMPTY_GRAPH = {
  nodes: {},
  edges: {},
  meta: {
    baseIRI: 'https://kg.local/',
    version: 1,
    title: 'Knowledge Graph',
  },
};

export function createEmptySnapshot(): PersistedSnapshot {
  return {
    id: crypto.randomUUID(),
    version: 1,
    savedAt: Date.now(),
    route: '/',
    selectedNodeId: null,
    graph: structuredClone(EMPTY_GRAPH),
    viewState: {
      zoom: 1,
      center: { x: 0, y: 0 },
    },
  };
}

export async function loadLastSnapshot(
  db: KgDb,
): Promise<PersistedSnapshot | null> {
  try {
    const meta = await db.get('meta', 'lastSnapshotId');
    debugLog('[snapshots] meta record:', meta);
    if (!meta) {
      debugLog('[snapshots] No lastSnapshotId in meta — fresh start');
      return null;
    }
    const snapshot = await db.get('snapshots', meta.lastSnapshotId);
    debugLog('[snapshots] loaded snapshot:', snapshot ? { id: snapshot.id, nodes: Object.keys(snapshot.graph?.nodes ?? {}).length } : 'null');
    if (!snapshot) {
      debugLog('[snapshots] Snapshot not found by id, clearing meta');
      return null;
    }
    if (
      !snapshot.graph ||
      typeof snapshot.graph !== 'object' ||
      !snapshot.graph.nodes ||
      !snapshot.graph.edges
    ) {
      console.warn('[snapshots] Corrupt snapshot detected, returning null');
      return null;
    }
    return snapshot;
  } catch (err) {
    console.error('[snapshots] Error loading last snapshot:', err);
    return null;
  }
}

export async function saveSnapshot(
  db: KgDb,
  snapshot: PersistedSnapshot,
): Promise<void> {
  await db.put('snapshots', snapshot);
  await db.put('meta', {
    key: 'lastSnapshotId',
    lastSnapshotId: snapshot.id,
    schemaVersion: 1,
    appVersion: '0.1.0',
  });
  debugLog('[snapshots] Saved snapshot:', snapshot.id, 'nodes:', Object.keys(snapshot.graph.nodes).length);
}

export async function listSnapshots(
  db: KgDb,
): Promise<PersistedSnapshot[]> {
  return db.getAllFromIndex('snapshots', 'savedAt');
}
