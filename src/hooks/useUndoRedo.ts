import { useCallback, useEffect } from 'react';
import { useSelector } from '@xstate/react';
import type { GraphActor } from '../machines/graphMachine';
import { selectUndoCount, selectRedoCount } from '../machines/selectors';

export interface UndoRedoState {
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
  undo: () => void;
  redo: () => void;
}

export function useUndoRedo(actor: GraphActor): UndoRedoState {
  const undoCount = useSelector(actor, selectUndoCount);
  const redoCount = useSelector(actor, selectRedoCount);

  const undo = useCallback(() => {
    actor.send({ type: 'UNDO' });
  }, [actor]);

  const redo = useCallback(() => {
    actor.send({ type: 'REDO' });
  }, [actor]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;

      // Undo: Ctrl+Z / Cmd+Z
      if (isMod && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        undo();
      }

      // Redo: Ctrl+Shift+Z / Cmd+Shift+Z
      if (isMod && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        redo();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  return {
    canUndo: undoCount > 0,
    canRedo: redoCount > 0,
    undoCount,
    redoCount,
    undo,
    redo,
  };
}
