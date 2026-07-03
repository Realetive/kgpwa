import {
  setup,
  fromPromise,
  assign,
  type Actor,
  type SnapshotFrom,
} from 'xstate';
import { clearHistory } from '../persistence/history';
import type { KgDb } from '../persistence/db';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HistoryContext {
  db: KgDb | null;
  errorMessage: string | null;
}

export type HistoryEvent =
  | { type: 'CLEAR' };

export type HistoryMachineSnapshot = SnapshotFrom<typeof historyMachine>;
export type HistoryActor = Actor<typeof historyMachine>;

// ─── Machine ─────────────────────────────────────────────────────────────────

export const historyMachine = setup({
  types: {
    context: {} as HistoryContext,
    events: {} as HistoryEvent,
  },
  actors: {
    clearHistoryActor: fromPromise(
      async ({ input }: { input: { db: KgDb } }): Promise<void> => {
        await clearHistory(input.db);
      },
    ),
  },
  actions: {
    setDb: assign({
      db: ({ event }) => {
        const e = event as any;
        return e.db;
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
  },
}).createMachine({
  id: 'history',
  initial: 'idle',

  context: {
    db: null,
    errorMessage: null,
  },

  states: {
    idle: {
      on: {
        CLEAR: {
          target: 'clearing',
        },
      },
    },
    clearing: {
      invoke: {
        src: 'clearHistoryActor',
        input: ({ context }) => ({
          db: context.db as KgDb,
        }),
        onDone: {
          target: 'idle',
        },
        onError: {
          target: 'idle',
          actions: 'assignError',
        },
      },
    },
  },
});
