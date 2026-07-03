import type { KgDb } from '../persistence/db';
import type { HistoryEntry } from '../types/persistence';
import type { KGGraph } from '../types/kg';

const MAX_HISTORY_ENTRIES = 50;

export async function saveHistoryEntry(
  db: KgDb,
  entry: HistoryEntry,
): Promise<void> {
  await db.put('history', entry);
}

export async function loadHistory(
  db: KgDb,
): Promise<HistoryEntry[]> {
  return db.getAllFromIndex('history', 'timestamp');
}

export async function pruneHistory(
  db: KgDb,
  maxEntries: number = MAX_HISTORY_ENTRIES,
): Promise<void> {
  const all = await db.getAllFromIndex('history', 'timestamp');
  if (all.length <= maxEntries) {
    return;
  }
  const excess = all.length - maxEntries;
  const toDelete = all.slice(0, excess);
  const tx = db.transaction('history', 'readwrite');
  for (const entry of toDelete) {
    await tx.store.delete(entry.id);
  }
  await tx.done;
}

export async function clearHistory(db: KgDb): Promise<void> {
  await db.clear('history');
}

export function createHistoryEntry(
  snapshotId: string,
  actionType: string,
  graph: KGGraph,
): HistoryEntry {
  return {
    id: crypto.randomUUID(),
    snapshotId,
    actionType,
    timestamp: Date.now(),
    graph: structuredClone(graph),
  };
}
