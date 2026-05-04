// RSC runtime re-exports. Resolved via package.json #rsc-runtime import map
// under the "react-server" condition. Non-RSC environments get rsc-runtime.default.ts instead.
export {
  renderToReadableStream,
  createTemporaryReferenceSet,
  decodeReply,
  decodeAction,
  decodeFormState,
  loadServerAction,
} from '@vitejs/plugin-rsc/rsc'

export const __spiceflowVitestMode = false
