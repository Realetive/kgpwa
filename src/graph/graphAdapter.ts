import type { KGGraph, KGNode, KGEdge } from '../types/kg';

export interface G6NodeModel {
  id: string;
  data: {
    label: string;
    type: string;
    nodeData: KGNode;
  };
  style?: Record<string, unknown>;
}

export interface G6EdgeModel {
  id: string;
  source: string;
  target: string;
  data: {
    predicate: string;
    weight?: number;
    edgeData: KGEdge;
  };
  style?: Record<string, unknown>;
}

export interface G6GraphData {
  nodes: G6NodeModel[];
  edges: G6EdgeModel[];
}

export function kgGraphToG6Data(graph: KGGraph): G6GraphData {
  const nodes: G6NodeModel[] = Object.values(graph.nodes).map((node) => ({
    id: node.id,
    data: {
      label: node.label,
      type: node.type,
      nodeData: node,
    },
    style: {
      fill: getNodeColor(node.type),
      stroke: 'var(--color-border)',
      lineWidth: 2,
    },
  }));

  const edges: G6EdgeModel[] = Object.values(graph.edges).map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    data: {
      predicate: edge.predicate,
      weight: edge.weight,
      edgeData: edge,
    },
    style: {
      stroke: 'var(--color-text-muted)',
      lineWidth: 1 + (edge.weight ?? 0) * 0.5,
    },
  }));

  return { nodes, edges };
}

// Color palette based on node type
const TYPE_COLORS: Record<string, string> = {
  Concept: '#4f98a3',
  Entity: '#d163a7',
  Event: '#c4a346',
};

function getNodeColor(type: string): string {
  return TYPE_COLORS[type] ?? '#797876';
}
