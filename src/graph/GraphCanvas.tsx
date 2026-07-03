import { useEffect, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Graph } from '@antv/g6';
import { kgGraphToG6Data } from '../graph/graphAdapter';
import type { KGGraph } from '../types/kg';

export interface GraphCanvasProps {
  graph?: KGGraph;
  selectedNodeId?: string | null;
  onNodeClick?: (nodeId: string) => void;
}

export default function GraphCanvas({
  graph,
  selectedNodeId,
  onNodeClick,
}: GraphCanvasProps): ReactNode {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const onNodeClickRef = useRef(onNodeClick);
  const initStartedRef = useRef(false);
  onNodeClickRef.current = onNodeClick;

  const navigate = useNavigate();

  // Create the G6 graph as soon as the container mounts.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || initStartedRef.current) return;
    initStartedRef.current = true;

    let raf: number;
    let cancelled = false;

    const tryCreate = async () => {
      if (cancelled) return;
      if (el.clientWidth > 0 && el.clientHeight > 0) {
        const { Graph: G6Graph } = await import('@antv/g6');

        if (cancelled) return;

        const g6Graph = new G6Graph({
          container: el,
          width: el.clientWidth,
          height: el.clientHeight,
          background: '#171614',
          animation: true,
          node: {
            type: 'circle',
            style: {
              size: 36,
              labelText: (d: Record<string, unknown>) =>
                (d.data as { label?: string } | undefined)?.label ?? '',
              labelFill: '#cdccca',
              labelFontSize: 11,
              labelPlacement: 'bottom',
              labelOffsetY: 6,
              fill: '#4f98a3',
              stroke: '#393836',
              lineWidth: 2,
            },
          } as never,
          edge: {
            type: 'line',
            style: {
              stroke: '#797876',
              lineWidth: 1,
              endArrow: true,
            },
          } as never,
          behaviors: ['drag-canvas', 'zoom-canvas', 'drag-element'],
          layout: {
            type: 'd3-force',
            preventOverlap: true,
            animated: true,
            linkDistance: 200,
            nodeStrength: -600,
            collideStrength: 1,
            alphaDecay: 0.01,
            alphaMin: 0.001,
          },
        });

        g6Graph.render();

        g6Graph.on('node:click', (evt: unknown) => {
          const target = (evt as { target?: { id?: string } }).target;
          const nodeId = target?.id;
          if (nodeId) {
            navigate(`/node/${nodeId}`);
          }
          if (onNodeClickRef.current && nodeId) {
            onNodeClickRef.current(nodeId);
          }
        });

        graphRef.current = g6Graph;

        // Set initial data if available
        if (graph && Object.keys(graph.nodes).length > 0) {
          const data = kgGraphToG6Data(graph);
          try {
            g6Graph.setData(data as any);
            g6Graph.render();
          } catch (err) {
            import.meta.env.DEV && console.warn('[GraphCanvas] setData/render failed:', err);
          }
        }
      } else {
        raf = requestAnimationFrame(tryCreate);
      }
    };

    const handleResize = () => {
      const c = containerRef.current;
      if (c && graphRef.current && !graphRef.current.destroyed) {
        graphRef.current.setSize(c.clientWidth, c.clientHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    raf = requestAnimationFrame(tryCreate);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleResize);
      if (graphRef.current && !graphRef.current.destroyed) {
        graphRef.current.destroy();
        graphRef.current = null;
      }
    };
  }, [navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync graph data when it changes. Also apply selection highlight.
  useEffect(() => {
    const g6Graph = graphRef.current;
    if (!g6Graph || g6Graph.destroyed || !graph) return;

    const data = kgGraphToG6Data(graph);

    // Highlight selected node
    if (selectedNodeId) {
      for (const node of data.nodes) {
        if (node.id === selectedNodeId) {
          node.style = {
            ...node.style,
            fill: '#d163a7',
            stroke: '#d163a7',
          };
        }
      }
    }

    try {
      g6Graph.setData(data as any);
      g6Graph.render();
    } catch (err) {
      import.meta.env.DEV && console.warn('[GraphCanvas] setData/render failed:', err);
      return;
    }

    // Center on selected node — use a small delay to let layout settle
    if (selectedNodeId) {
      setTimeout(() => {
        if (graphRef.current?.destroyed) return;
        try {
          g6Graph.focusElement(selectedNodeId, { duration: 300 });
        } catch {
          // focusElement may throw if node isn't laid out yet
        }
      }, 100);
    }
  }, [graph, selectedNodeId]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '400px',
      }}
    />
  );
}
