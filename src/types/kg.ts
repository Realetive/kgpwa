export type NodeId = string; // UUID v4

export interface KGNode {
  id: NodeId;
  label: string;
  type: string; // онтологический тип: 'Concept' | 'Entity' | 'Event' | string
  properties: Record<string, string | number | boolean>;
  createdAt: number; // unix ms
  updatedAt: number;
}

export interface KGEdge {
  id: string;
  source: NodeId;
  target: NodeId;
  predicate: string; // IRI-совместимое имя отношения
  weight?: number;
  createdAt: number;
}

export interface KGGraph {
  nodes: Record<NodeId, KGNode>;
  edges: Record<string, KGEdge>;
  meta: {
    baseIRI: string; // например: 'https://kg.local/'
    version: number;
    title: string;
  };
}

export interface RDFQuad {
  subject: string; // IRI
  predicate: string; // IRI
  object: string; // IRI или literal
  graph: string; // named graph IRI
}
