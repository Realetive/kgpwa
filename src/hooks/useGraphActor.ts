// ─── Thin wrappers over @xstate/react ────────────────────────────────────────
//
// Prefer using useSelector() + selectors from ../machines/selectors.ts directly
// in components. This file exists for backward compatibility and re-exports.
//
// The useGraphState and useGraphActions hooks have been replaced by:
//   - useSelector(actor, selectGraph)       for reactive graph reads
//   - useSelector(actor, selectNodes)        for nodes-only reads
//   - useSelector(actor, selectSelectedNodeId) for selection reads
//   - actor.send({ type: '...', ... })       for sending events
//
// See: src/machines/selectors.ts for available selectors.
