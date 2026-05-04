// Public test utilities for vitest. Import from 'spiceflow/testing'.
// SpiceflowTestResponse is returned by app.handle() for page routes when
// the spiceflow-vitest condition is active. runAction wraps server action
// calls with request context so getActionRequest() works in tests.
// replaceLayoutContent swaps LayoutContent placeholders in layout elements
// so they can be rendered standalone with renderToStaticMarkup.
export { SpiceflowTestResponse, replaceLayoutContent } from './spiceflow.js'
export { runAction } from './action-context.js'
