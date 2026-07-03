import { useCallback } from 'react';
import { useSelector } from '@xstate/react';
import { getBootActor, type BootMachineSnapshot } from '../machines/bootMachine';

export type BootPhase = 'cold' | 'hydrating' | 'ready' | 'error';

export interface BootState {
  phase: BootPhase;
  errorMessage: string | null;
}

export function useBootState(): BootState {
  const actor = getBootActor();

  if (!actor) {
    return { phase: 'cold', errorMessage: null };
  }

  const snapshot = useSelector(
    actor,
    (snap: BootMachineSnapshot): BootState => {
      const value = snap.value;
      const ctx = snap.context;

      if (value === 'cold') return { phase: 'cold', errorMessage: null };
      if (value === 'openingDb' || value === 'loadingSnapshot' || value === 'seeding')
        return { phase: 'hydrating', errorMessage: null };
      if (value === 'ready')
        return { phase: 'ready', errorMessage: null };
      if (value === 'error')
        return { phase: 'error', errorMessage: ctx.errorMessage };

      return { phase: 'hydrating', errorMessage: null };
    },
  );

  return snapshot;
}

export function useBootErrorRetry(): () => void {
  const actor = getBootActor();
  return useCallback(() => {
    actor?.send({ type: 'RETRY' });
  }, [actor]);
}

export function useBootErrorReset(): () => void {
  const actor = getBootActor();
  return useCallback(() => {
    actor?.send({ type: 'RESET' });
  }, [actor]);
}
