// Vite adapter for the RSC server environment (react-server conditions).
// Re-exports from @vitejs/plugin-rsc/rsc which wraps react-server-dom-webpack.
export {
  renderToReadableStream,
  createTemporaryReferenceSet,
  decodeReply,
  decodeAction,
  decodeFormState,
  loadServerAction,
} from '@vitejs/plugin-rsc/rsc'

// Global CSS for the app entry module. rscCssTransform auto-wraps exported React
// component functions, but the app entry exports a Spiceflow instance. This manual
// loadCss() call covers CSS imported at the app entry level (e.g. tailwind, resets).
// The plugin transforms this at compile time into a React element with <link> tags.
export function getAppEntryCssElement(): React.ReactNode {
  return import.meta.viteRsc.loadCss('virtual:app-entry')
}
