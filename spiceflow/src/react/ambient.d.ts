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

declare module 'virtual:spiceflow-dirs' {
  export const publicDir: string
  export const distDir: string
}

declare module 'virtual:spiceflow-import-map' {
  const importMapJson: string
  export default importMapJson
}

// Federation: Flight decoder exposed globally by entry.client.tsx
// so RemoteIsland can decode remote Flight payloads in the browser.
declare var __spiceflow_createFromReadableStream: (<T>(
  stream: ReadableStream<Uint8Array>,
) => PromiseLike<T>) | undefined
