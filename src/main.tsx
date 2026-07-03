import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/tokens.css';
import './styles/base.css';
import './styles/skeleton.css';

// ─── Step 1: Immediate render — NO async before this point ──────────────────

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element #root not found in DOM');
}

const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// ─── Step 2: Boot initialization after first paint ──────────────────────────
// queueMicrotask ensures the boot actor starts AFTER React has committed the
// App Shell skeleton to the DOM. This gives instant visual feedback.

queueMicrotask(async () => {
  const { startBoot } = await import('./machines/bootMachine');
  startBoot();
});
