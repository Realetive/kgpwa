import type { KGGraph } from '../types/kg';

/**
 * Demo knowledge graph — a small semantic web about Knowledge Graphs themselves.
 * Loaded only when the store is empty (fresh start).
 */
export const demoGraph: KGGraph = {
  nodes: {
    'demo-1': {
      id: 'demo-1',
      label: 'Knowledge Graph',
      type: 'Concept',
      properties: {
        description: 'A structured representation of knowledge as entities and relationships',
        domain: 'Computer Science',
      },
      createdAt: 0,
      updatedAt: 0,
    },
    'demo-2': {
      id: 'demo-2',
      label: 'RDF',
      type: 'Concept',
      properties: {
        description: 'Resource Description Framework — a W3C standard for data interchange',
        since: 1999,
      },
      createdAt: 0,
      updatedAt: 0,
    },
    'demo-3': {
      id: 'demo-3',
      label: 'SPARQL',
      type: 'Concept',
      properties: {
        description: 'Query language for RDF graphs',
        since: 2008,
      },
      createdAt: 0,
      updatedAt: 0,
    },
    'demo-4': {
      id: 'demo-4',
      label: 'Ontology',
      type: 'Concept',
      properties: {
        description: 'Formal specification of concepts and relationships in a domain',
      },
      createdAt: 0,
      updatedAt: 0,
    },
    'demo-5': {
      id: 'demo-5',
      label: 'Tim Berners-Lee',
      type: 'Entity',
      properties: {
        description: 'Inventor of the World Wide Web and advocate for Linked Data',
        nationality: 'British',
      },
      createdAt: 0,
      updatedAt: 0,
    },
    'demo-6': {
      id: 'demo-6',
      label: 'Semantic Web',
      type: 'Concept',
      properties: {
        description: 'Extension of the Web to make data machine-readable via standards',
        coinedBy: 'Tim Berners-Lee',
      },
      createdAt: 0,
      updatedAt: 0,
    },
    'demo-7': {
      id: 'demo-7',
      label: 'JSON-LD',
      type: 'Concept',
      properties: {
        description: 'JSON-based format to serialize Linked Data',
        since: 2014,
      },
      createdAt: 0,
      updatedAt: 0,
    },
  },
  edges: {
    'demo-e1': {
      id: 'demo-e1',
      source: 'demo-1',
      target: 'demo-2',
      predicate: 'uses',
      createdAt: 0,
    },
    'demo-e2': {
      id: 'demo-e2',
      source: 'demo-2',
      target: 'demo-3',
      predicate: 'queriedBy',
      createdAt: 0,
    },
    'demo-e3': {
      id: 'demo-e3',
      source: 'demo-1',
      target: 'demo-4',
      predicate: 'requires',
      createdAt: 0,
    },
    'demo-e4': {
      id: 'demo-e4',
      source: 'demo-5',
      target: 'demo-1',
      predicate: 'advocated',
      createdAt: 0,
    },
    'demo-e5': {
      id: 'demo-e5',
      source: 'demo-6',
      target: 'demo-1',
      predicate: 'subClassOf',
      createdAt: 0,
    },
    'demo-e6': {
      id: 'demo-e6',
      source: 'demo-6',
      target: 'demo-5',
      predicate: 'createdBy',
      createdAt: 0,
    },
    'demo-e7': {
      id: 'demo-e7',
      source: 'demo-1',
      target: 'demo-7',
      predicate: 'serializedWith',
      createdAt: 0,
    },
  },
  meta: {
    baseIRI: 'https://kg.local/',
    version: 1,
    title: 'Knowledge Graph Demo',
  },
};
