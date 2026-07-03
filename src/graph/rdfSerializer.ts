import type { KGGraph } from '../types/kg';

/**
 * Сериализует KGGraph в N-Quads формат.
 * Одна строка = один квад:
 *   <subject> <predicate> <object> <graphName> .
 */
export function exportToNQuads(graph: KGGraph): string {
  const base = graph.meta.baseIRI;
  const graphIRI = `${base}graph/default`;
  const lines: string[] = [];

  for (const node of Object.values(graph.nodes)) {
    const subject = `<${base}${node.id}>`;

    // Node type declaration: rdf:type
    lines.push(
      `${subject} <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <${base}ontology/${node.type}> ${graphIRI} .`,
    );

    // Node label: rdfs:label
    lines.push(
      `${subject} <http://www.w3.org/2000/01/rdf-schema#label> "${escapeLiteral(node.label)}" ${graphIRI} .`,
    );

    // Node properties as custom predicates
    for (const [key, value] of Object.entries(node.properties)) {
      const predicate = `<${base}ontology/${key}>`;
      const objectLit = formatRdfValue(value);
      lines.push(`${subject} ${predicate} ${objectLit} ${graphIRI} .`);
    }
  }

  for (const edge of Object.values(graph.edges)) {
    const subject = `<${base}${edge.source}>`;
    const predicate = `<${base}ontology/${edge.predicate}>`;
    const object = `<${base}${edge.target}>`;

    let line = `${subject} ${predicate} ${object} ${graphIRI} .`;

    // If weight is present, reify with a blank node (simple approach)
    if (edge.weight !== undefined) {
      const reifId = `_:r${edge.id}`;
      line += `\n${reifId} <http://www.w3.org/1999/02/22-rdf-syntax-ns#subject> ${subject} ${graphIRI} .`;
      line += `\n${reifId} <http://www.w3.org/1999/02/22-rdf-syntax-ns#predicate> ${predicate} ${graphIRI} .`;
      line += `\n${reifId} <http://www.w3.org/1999/02/22-rdf-syntax-ns#object> ${object} ${graphIRI} .`;
      line += `\n${reifId} <${base}ontology/weight> "${edge.weight}"^^<http://www.w3.org/2001/XMLSchema#decimal> ${graphIRI} .`;
    }

    lines.push(line);
  }

  return lines.join('\n') + '\n';
}

/**
 * Сериализует KGGraph в JSON-LD формат (@graph с @context).
 */
export function exportToJSONLD(graph: KGGraph): object {
  const base = graph.meta.baseIRI;
  const nodes: object[] = [];

  for (const node of Object.values(graph.nodes)) {
    const nodeObj: Record<string, unknown> = {
      '@id': `${base}${node.id}`,
      '@type': `${base}ontology/${node.type}`,
      'http://www.w3.org/2000/01/rdf-schema#label': node.label,
    };

    for (const [key, value] of Object.entries(node.properties)) {
      nodeObj[`${base}ontology/${key}`] = value;
    }

    nodes.push(nodeObj);
  }

  for (const edge of Object.values(graph.edges)) {
    const edgeObj: Record<string, unknown> = {
      '@id': `${base}${edge.source}`,
      [`${base}ontology/${edge.predicate}`]: {
        '@id': `${base}${edge.target}`,
      },
    };

    if (edge.weight !== undefined) {
      (edgeObj[`${base}ontology/${edge.predicate}`] as Record<string, unknown>)[
        `${base}ontology/weight`
      ] = edge.weight;
    }

    nodes.push(edgeObj);
  }

  return {
    '@context': {
      rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
      rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
      xsd: 'http://www.w3.org/2001/XMLSchema#',
      base: base,
      ontology: `${base}ontology/`,
    },
    '@graph': nodes,
  };
}

function escapeLiteral(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

function formatRdfValue(value: string | number | boolean): string {
  if (typeof value === 'string') {
    return `"${escapeLiteral(value)}"`;
  }
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return `"${value}"^^<http://www.w3.org/2001/XMLSchema#integer>`;
    }
    return `"${value}"^^<http://www.w3.org/2001/XMLSchema#decimal>`;
  }
  return `"${value}"^^<http://www.w3.org/2001/XMLSchema#boolean>`;
}
