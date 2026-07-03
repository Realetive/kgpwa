import { type ReactNode, useMemo, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from '@xstate/react';
import { useAppContext } from '../components/AppShell';
import { selectGraph, selectSelectedNodeId } from '../machines/selectors';
import GraphCanvas from './GraphCanvas';

export default function GraphCanvasWrapper(): ReactNode {
  const { graphActor } = useAppContext();
  const { nodeId: routeNodeId } = useParams<{ nodeId?: string }>();
  const graph = useSelector(graphActor, selectGraph);
  const selectedNodeId = useSelector(graphActor, selectSelectedNodeId);

  // Sync route param → graphMachine selection
  useEffect(() => {
    if (routeNodeId) {
      graphActor.send({ type: 'SELECT_NODE', id: routeNodeId });
    } else {
      graphActor.send({ type: 'SELECT_NODE', id: null });
    }
  }, [routeNodeId, graphActor]);

  const isEmpty = useMemo(
    () => Object.keys(graph.nodes).length === 0,
    [graph],
  );

  if (isEmpty) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--color-text-muted)',
        fontSize: 'var(--text-sm)',
      }}>
        Граф пуст. Добавьте ноды, чтобы начать.
      </div>
    );
  }

  return (
    <div style={{ flex: 1, height: '100%', position: 'relative' }}>
      <GraphCanvas
        graph={graph}
        selectedNodeId={selectedNodeId}
      />
    </div>
  );
}
