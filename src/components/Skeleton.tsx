import type { ReactNode } from 'react';

export interface SkeletonProps {
  variant: 'canvas' | 'panel' | 'node-list';
}

export function Skeleton({ variant }: SkeletonProps): ReactNode {
  if (variant === 'canvas') {
    return (
      <div
        className="skeleton skeleton--canvas"
        role="status"
        aria-label="Загрузка графа"
      />
    );
  }

  if (variant === 'panel') {
    return (
      <div
        className="skeleton--panel"
        role="status"
        aria-label="Загрузка панели"
      >
        <div className="skeleton-line" />
        <div className="skeleton-line" />
        <div className="skeleton-line" />
        <div className="skeleton-line" />
        <div className="skeleton-line" />
      </div>
    );
  }

  if (variant === 'node-list') {
    return (
      <div
        className="skeleton--node-list"
        role="status"
        aria-label="Загрузка списка нод"
      >
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton-node" />
        ))}
      </div>
    );
  }

  return null;
}
