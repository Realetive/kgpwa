import { Suspense, lazy } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { Skeleton } from './components/Skeleton';
import { ErrorBoundary } from './components/ErrorBoundary';

// Heavy components — lazy loaded to keep initial bundle small
const GraphCanvasWrapper = lazy(() => import('./graph/GraphCanvasWrapper'));
const NodePanel = lazy(() => import('./components/NodePanel'));

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <AppShell />,
      children: [
        {
          // Index route: renders graph canvas on the main page (/)
          index: true,
          element: (
            <ErrorBoundary>
              <Suspense fallback={<Skeleton variant="canvas" />}>
                <GraphCanvasWrapper />
              </Suspense>
            </ErrorBoundary>
          ),
        },
        {
          // Node detail route: renders graph + node panel side by side
          path: 'node/:nodeId',
          element: (
            <ErrorBoundary>
              <Suspense fallback={<Skeleton variant="canvas" />}>
                <GraphCanvasWrapper />
              </Suspense>
              <Suspense fallback={<Skeleton variant="panel" />}>
                <NodePanel />
              </Suspense>
            </ErrorBoundary>
          ),
        },
      ],
    },
  ],
  { basename: import.meta.env.APP_BASE },
);

export function App() {
  return <RouterProvider router={router} />;
}
