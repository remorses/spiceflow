/// <reference types="vite/client" />
/// <reference types="@vitejs/plugin-rsc/types" />

declare module 'virtual:app-entry' {
  import type { Spiceflow } from 'spiceflow'
  export const app: Spiceflow
  export default any
}

declare module '#rsc-runtime' {
  export {
    renderToReadableStream,
    createTemporaryReferenceSet,
    decodeReply,
    decodeAction,
    decodeFormState,
    loadServerAction,
  } from '@vitejs/plugin-rsc/rsc'
}

declare module 'virtual:spiceflow-deployment-id' {
  const deploymentId: string | undefined
  export default deploymentId
}
