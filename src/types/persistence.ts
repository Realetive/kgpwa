import type { KGGraph } from './kg';

export interface PersistedSnapshot {
  id: string; // UUID
  version: number; // schema version, текущая: 1
  savedAt: number; // unix ms
  route: string; // последний активный URL
  selectedNodeId: string | null;
  graph: KGGraph;
  viewState: {
    zoom: number;
    center: { x: number; y: number };
  };
}

export interface HistoryEntry {
  id: string;
  snapshotId: string;
  actionType: string; // 'ADD_NODE' | 'REMOVE_NODE' | 'ADD_EDGE' | ...
  timestamp: number;
  graph: KGGraph; // полный снапшот на момент действия
}

export interface PersistenceMeta {
  key: string;
  lastSnapshotId: string;
  schemaVersion: number;
  appVersion: string;
}
