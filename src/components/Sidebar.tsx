import { type ReactNode, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from '@xstate/react';
import { useAppContext } from './AppShell'
import { selectNodes } from '../machines/selectors';
import type { KGNode } from '../types/kg';

export function Sidebar(): ReactNode {
  const [search, setSearch] = useState('');
  const { graphActor } = useAppContext();
  const navigate = useNavigate();

  const nodesMap = useSelector(graphActor, selectNodes);

  const nodes: KGNode[] = useMemo(
    () => Object.values(nodesMap),
    [nodesMap],
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return nodes;
    const q = search.toLowerCase();
    return nodes.filter(
      (n) =>
        n.label.toLowerCase().includes(q) ||
        n.type.toLowerCase().includes(q),
    );
  }, [nodes, search]);

  const isEmpty = nodes.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: 'var(--space-3)' }}>
        <input
          type="search"
          placeholder="Поиск нод..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: 'var(--space-2) var(--space-3)',
            background: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--color-text)',
            fontSize: 'var(--text-xs)',
            outline: 'none',
          }}
        />
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 var(--space-3) var(--space-3)',
        }}
      >
        {filtered.length === 0 ? (
          <p
            style={{
              color: 'var(--color-text-muted)',
              fontSize: 'var(--text-xs)',
              padding: 'var(--space-4) var(--space-2)',
              textAlign: 'center',
            }}
          >
            {isEmpty ? 'Нет нод. Добавьте первую ноду на графе.' : 'Ничего не найдено'}
          </p>
        ) : (
          <NodeList nodes={filtered} onNodeClick={(id) => navigate(`/node/${id}`)} />
        )}
      </div>

      <div
        style={{
          borderTop: '1px solid var(--color-border)',
          padding: 'var(--space-3)',
        }}
      >
        <button
          style={{
            width: '100%',
            padding: 'var(--space-2)',
            background: 'var(--color-primary)',
            color: 'white',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--text-xs)',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          + Новая нода
        </button>
      </div>
    </div>
  );
}

function NodeList({
  nodes,
  onNodeClick,
}: {
  nodes: KGNode[];
  onNodeClick: (id: string) => void;
}): ReactNode {
  return (
    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
      {nodes.map((node) => (
        <li key={node.id}>
          <button
            onClick={() => onNodeClick(node.id)}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: 'var(--space-2) var(--space-3)',
              background: 'transparent',
              border: '1px solid transparent',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text)',
              fontSize: 'var(--text-xs)',
              cursor: 'pointer',
              transition: 'background var(--transition)',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.background =
                'var(--color-surface-2)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.background =
                'transparent';
            }}
          >
            <div style={{ fontWeight: 500 }}>{node.label}</div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
              {node.type}
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
