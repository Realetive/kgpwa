import { demoGraph } from '../data/demoGraph';
import { saveSnapshot } from './snapshots';
import type { KgDb } from './db';
import type { PersistedSnapshot } from '../types/persistence';

/**
 * Checks if the store is empty (no nodes) and seeds demo data if so.
 * Returns the snapshot that was saved (or null if store was already populated).
 */
export async function seedDemoIfEmpty(db: KgDb): Promise<PersistedSnapshot | null> {
  const allSnapshots = await db.getAll('snapshots');
  const hasData = allSnapshots.some(
    (s) => Object.keys(s.graph.nodes).length > 0,
  );

  if (hasData) {
    return null;
  }

  const now = Date.now();
  const snapshot: PersistedSnapshot = {
    id: crypto.randomUUID(),
    version: 1,
    savedAt: now,
    route: '/',
    selectedNodeId: null,
    graph: structuredClone(demoGraph),
    viewState: {
      zoom: 1,
      center: { x: 0, y: 0 },
    },
  };

  // Update timestamps to now (not epoch 0 from demo data)
  for (const node of Object.values(snapshot.graph.nodes)) {
    node.createdAt = now;
    node.updatedAt = now;
  }
  for (const edge of Object.values(snapshot.graph.edges)) {
    edge.createdAt = now;
  }

  await saveSnapshot(db, snapshot);
  return snapshot;
}
