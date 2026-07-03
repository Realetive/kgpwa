import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { useActorRef, useSelector } from '@xstate/react';
import { useBootState, useBootErrorRetry } from '../hooks/useBootState';
import { graphMachine, type GraphActor } from '../machines/graphMachine';
import { getBootActor } from '../machines/bootMachine';
import { Sidebar } from './Sidebar';
import { Skeleton } from './Skeleton';
import { ErrorBoundary } from './ErrorBoundary';
import type { PersistedSnapshot } from '../types/persistence';
import type { KgDb } from '../persistence/db';

// ─── Context ─────────────────────────────────────────────────────────────────

export interface AppContext {
  graphActor: GraphActor;
}

const AppCtx = createContext<AppContext>(null!);

export function useAppContext(): AppContext {
  return useContext(AppCtx);
}

// ─── Hydration helper ────────────────────────────────────────────────────────

/**
 * Watches the bootActor and hydrates the graphActor as soon as
 * bootMachine reaches 'ready' with a non-null snapshot.
 * Uses useSelector to reactively track the snapshot — no timing issues.
 */
function useHydrateGraph(actor: GraphActor) {
  const bootActor = getBootActor();

  // Reactively watch the boot machine's snapshot
  const bootSnap = useSelector(bootActor!, (snap) => {
    return {
      phase: snap.value as string,
      snapshot: snap.context.snapshot,
      db: snap.context.db,
    };
  });

  const doneRef = useRef(false);

  useEffect(() => {
    if (doneRef.current) return;
    const { snapshot, db } = bootSnap;
    if (!snapshot || !db) return;

    import.meta.env.DEV && console.log('[AppShell] Hydrating graphActor with snapshot:', snapshot.id, 'nodes:', Object.keys(snapshot.graph.nodes).length);
    actor.send({ type: 'HYDRATE', snapshot, db: db as any });
    doneRef.current = true;
  }, [actor, bootSnap]);
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AppShell(): ReactNode {
  const { phase, errorMessage } = useBootState();

  // useActorRef creates the actor once and returns a stable reference
  const graphActor = useActorRef(graphMachine);
  useHydrateGraph(graphActor);

  const ctx: AppContext = useMemo(
    () => ({ graphActor }),
    [graphActor],
  );

  const sidebarContent = useMemo(() => {
    switch (phase) {
      case 'cold':
      case 'hydrating':
        return <Skeleton variant="node-list" />;
      case 'error':
        return <BootErrorView message={errorMessage} />;
      case 'ready':
        return <Sidebar />;
    }
  }, [phase, errorMessage]);

  return (
    <AppCtx.Provider value={ctx}>
      <div style={{
        display: 'grid',
        gridTemplateRows: '48px 1fr',
        gridTemplateColumns: '260px 1fr',
        gridTemplateAreas: '"header header" "sidebar main"',
        height: '100dvh',
        overflow: 'hidden',
      }}>
        <header style={{
          gridArea: 'header',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-3)',
          padding: '0 var(--space-4)',
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke="var(--color-primary)" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5" r="2" />
            <path d="M5 19a7 7 0 0 1 14 0" />
            <circle cx="12" cy="12" r="3" />
            <line x1="12" y1="9" x2="12" y2="5" />
            <line x1="12" y1="15" x2="12" y2="19" />
          </svg>
          <span style={{
            fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text)',
          }}>
            Knowledge Graph
          </span>
          <nav style={{ marginLeft: 'auto', display: 'flex', gap: 'var(--space-2)' }}>
            <span style={{
              fontSize: 'var(--text-xs)',
              color: phase === 'hydrating' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            }}>
              {phase === 'hydrating' ? 'Загрузка...' : 'Готово'}
            </span>
          </nav>
        </header>

        <aside style={{
          gridArea: 'sidebar',
          background: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
          overflowY: 'auto',
        }}>
          {sidebarContent}
        </aside>

        <main style={{
          gridArea: 'main',
          background: 'var(--color-bg)',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
        }}>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </AppCtx.Provider>
  );
}

function BootErrorView({ message }: { message: string | null }): ReactNode {
  const retry = useBootErrorRetry();
  return (
    <div style={{
      padding: 'var(--space-4)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-3)',
      alignItems: 'center',
      textAlign: 'center',
    }}>
      <p style={{ color: 'var(--color-error)', fontSize: 'var(--text-sm)' }}>
        Ошибка загрузки: {message ?? 'Неизвестная ошибка'}
      </p>
      <button onClick={retry} style={{
        padding: 'var(--space-1) var(--space-3)',
        background: 'var(--color-primary)',
        color: 'white',
        borderRadius: 'var(--radius-sm)',
        fontSize: 'var(--text-xs)',
        fontWeight: 500,
      }}>
        Начать заново
      </button>
    </div>
  );
}

