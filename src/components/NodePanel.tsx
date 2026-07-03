import { type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from '@xstate/react';
import { useAppContext } from './AppShell';
import { selectGraph } from '../machines/selectors';
import type { KGNode } from '../types/kg';

export default function NodePanel(): ReactNode {
  const { nodeId } = useParams<{ nodeId: string }>();
  const navigate = useNavigate();
  const { graphActor } = useAppContext();

  const graph = useSelector(graphActor, selectGraph);

  const node: KGNode | null = nodeId ? (graph.nodes[nodeId] ?? null) : null;

  if (!nodeId) {
    return null;
  }

  return (
    <div
      style={{
        width: '320px',
        minWidth: '320px',
        height: '100%',
        background: 'var(--color-surface)',
        borderLeft: '1px solid var(--color-border)',
        padding: 'var(--space-4)',
        overflowY: 'auto',
        boxShadow: 'var(--shadow-md)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
        <h3
          style={{
            fontSize: 'var(--text-base)',
            fontWeight: 600,
            margin: 0,
          }}
        >
          Свойства ноды
        </h3>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            fontSize: 'var(--text-lg)',
            lineHeight: 1,
            padding: 0,
          }}
          title="Закрыть"
        >
          ×
        </button>
      </div>

      {node ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <Field label="Label" value={node.label} />
          <Field label="Type" value={node.type} />
          <Field label="ID" value={node.id} mono />
          <div>
            <label style={labelStyle}>Properties</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              {Object.entries(node.properties).map(([key, value]) => (
                <div key={key} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 'var(--space-2)',
                  padding: 'var(--space-1) var(--space-2)',
                  background: 'var(--color-bg)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-xs)',
                }}>
                  <span style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-mono)' }}>{key}</span>
                  <span style={{ color: 'var(--color-text)', textAlign: 'right' }}>{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
              Created: {new Date(node.createdAt).toLocaleString()}
            </span>
            <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-xs)' }}>
              Updated: {new Date(node.updatedAt).toLocaleString()}
            </span>
          </div>
        </div>
      ) : (
        <p style={{
          color: 'var(--color-text-muted)',
          fontSize: 'var(--text-sm)',
          textAlign: 'center',
          padding: 'var(--space-8) var(--space-4)',
        }}>
          Нода не найдена. Возможно, она была удалена.
        </p>
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string | number; mono?: boolean }): ReactNode {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{
        fontSize: 'var(--text-sm)',
        color: 'var(--color-text)',
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font-body)',
        wordBreak: 'break-all',
        padding: 'var(--space-1) var(--space-2)',
        background: 'var(--color-bg)',
        borderRadius: 'var(--radius-sm)',
      }}>
        {value}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 'var(--text-xs)',
  color: 'var(--color-text-muted)',
  marginBottom: 'var(--space-1)',
  fontWeight: 500,
};

export { NodePanel };
