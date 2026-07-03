import {
  setup,
  fromPromise,
  assign,
  createActor,
  type SnapshotFrom,
  type Actor,
} from 'xstate';
import { openAppDb, type KgDb } from '../persistence/db';
import { loadLastSnapshot, createEmptySnapshot } from '../persistence/snapshots';
import { seedDemoIfEmpty } from '../persistence/seed';
import type { PersistedSnapshot } from '../types/persistence';

const debugLog = (...args: unknown[]) => { if (import.meta.env.DEV) console.log(...args); };

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BootContext {
  db: KgDb | null;
  snapshot: PersistedSnapshot | null;
  errorMessage: string | null;
}

export type BootEvent =
  | { type: 'RETRY' }
  | { type: 'RESET' };

export type BootMachineSnapshot = SnapshotFrom<typeof bootMachine>;
export type BootActor = Actor<typeof bootMachine>;

// ─── Machine ─────────────────────────────────────────────────────────────────

export const bootMachine = setup({
  types: {
    context: {} as BootContext,
    events: {} as BootEvent,
  },
  actors: {
    openDb: fromPromise(async (): Promise<KgDb> => {
      debugLog('[boot] Opening IndexedDB...');
      const db = await openAppDb();
      debugLog('[boot] IndexedDB opened');
      return db;
    }),

    loadSnapshot: fromPromise(
      async ({ input }: { input: { db: KgDb } }): Promise<PersistedSnapshot | null> => {
        debugLog('[boot] Loading last snapshot...');
        const snapshot = await loadLastSnapshot(input.db);
        debugLog('[boot] Load result:', snapshot ? 'found' : 'null');
        return snapshot;
      },
    ),

    seedDemo: fromPromise(
      async ({ input }: { input: { db: KgDb } }): Promise<PersistedSnapshot | null> => {
        debugLog('[boot] Attempting to seed demo data...');
        const seeded = await seedDemoIfEmpty(input.db);
        debugLog('[boot] Seed result:', seeded ? 'seeded ' + Object.keys(seeded.graph.nodes).length + ' nodes' : 'skipped (already has data)');
        return seeded;
      },
    ),
  },
  guards: {
    hasSnapshot: ({ event }) => {
      return (event as any).output !== null;
    },
  },
  actions: {
    assignDb: assign({
      db: ({ event }) => (event as any).output,
    }),

    assignSnapshot: assign({
      snapshot: ({ event }) => (event as any).output,
    }),

    assignFreshSnapshot: assign({
      snapshot: () => createEmptySnapshot(),
    }),

    assignSeededSnapshot: assign({
      snapshot: ({ event }) => {
        const output = (event as any).output;
        return output ?? createEmptySnapshot();
      },
    }),

    assignError: assign({
      errorMessage: ({ event }) => {
        const err = (event as any).error;
        if (err instanceof Error) return err.message;
        return String(err ?? 'Unknown error');
      },
    }),

    clearError: assign({
      errorMessage: null,
    }),

    resetContext: assign({
      db: null,
      snapshot: null,
      errorMessage: null,
    }),
  },
}).createMachine({
  id: 'boot',
  initial: 'cold',

  context: {
    db: null,
    snapshot: null,
    errorMessage: null,
  },

  states: {
    cold: {
      always: { target: 'openingDb' },
    },

    openingDb: {
      invoke: {
        src: 'openDb',
        onDone: {
          target: 'loadingSnapshot',
          actions: 'assignDb',
        },
        onError: {
          target: 'error',
          actions: 'assignError',
        },
      },
    },

    loadingSnapshot: {
      invoke: {
        src: 'loadSnapshot',
        input: ({ context }) => ({
          db: context.db as KgDb,
        }),
        onDone: [
          {
            target: 'ready',
            guard: 'hasSnapshot',
            actions: 'assignSnapshot',
          },
          {
            target: 'seeding',
            actions: 'assignFreshSnapshot',
          },
        ],
        onError: {
          target: 'error',
          actions: 'assignError',
        },
      },
    },

    seeding: {
      invoke: {
        src: 'seedDemo',
        input: ({ context }) => ({
          db: context.db as KgDb,
        }),
        onDone: {
          target: 'ready',
          actions: 'assignSeededSnapshot',
        },
        onError: {
          target: 'ready',
          actions: assign(({ context }) => ({
            ...context,
            errorMessage: null,
          })),
        },
      },
    },

    ready: {
      type: 'final',
    },

    error: {
      on: {
        RETRY: {
          target: 'openingDb',
          actions: ['clearError', 'resetContext'],
        },
        RESET: {
          target: 'openingDb',
          actions: ['clearError', 'resetContext'],
        },
      },
    },
  },
});

// ─── Bootstrapper ────────────────────────────────────────────────────────────

let bootActor: BootActor | null = null;

export function startBoot(): BootActor {
  if (bootActor) {
    return bootActor;
  }
  debugLog('[boot] Starting boot actor...');
  bootActor = createActor(bootMachine);
  bootActor.start();
  return bootActor;
}

export function getBootActor(): BootActor | null {
  return bootActor;
}
