import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { PersistedSnapshot, HistoryEntry, PersistenceMeta } from '../types/persistence';

export interface KgDbSchemaV1 extends DBSchema {
  snapshots: {
    key: string;
    value: PersistedSnapshot;
    indexes: { 'savedAt': number };
  };
  history: {
    key: string;
    value: HistoryEntry;
    indexes: { 'snapshotId': string; 'timestamp': number };
  };
  meta: {
    key: string;
    value: PersistenceMeta;
  };
}

export type KgDb = IDBPDatabase<KgDbSchemaV1>;

export async function openAppDb(): Promise<KgDb> {
  return openDB<KgDbSchemaV1>('kg-app-v1', 1, {
    upgrade(db, oldVersion, _newVersion, transaction) {
      if (oldVersion < 1) {
        const snapshotsStore = db.createObjectStore('snapshots', { keyPath: 'id' });
        snapshotsStore.createIndex('savedAt', 'savedAt');

        const historyStore = db.createObjectStore('history', { keyPath: 'id' });
        historyStore.createIndex('snapshotId', 'snapshotId');
        historyStore.createIndex('timestamp', 'timestamp');

        db.createObjectStore('meta', { keyPath: 'key' });
      }
    },
  });
}
