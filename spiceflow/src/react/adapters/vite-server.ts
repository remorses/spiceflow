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
