/// <reference types="vite/client" />
/// <reference types="@vitejs/plugin-rsc/types" />

declare module 'virtual:app-entry' {
  import type { Spiceflow } from 'spiceflow'
  export const app: Spiceflow
  export default any
}

declare module 'virtual:bundler-adapter/server' {
  import type { RscServerAdapter } from '../adapters/types.js'
  export const renderToReadableStream: RscServerAdapter['renderToReadableStream']
  export const createTemporaryReferenceSet: RscServerAdapter['createTemporaryReferenceSet']
  export const decodeReply: RscServerAdapter['decodeReply']
  export const decodeAction: RscServerAdapter['decodeAction']
  export const decodeFormState: RscServerAdapter['decodeFormState']
  export const loadServerAction: RscServerAdapter['loadServerAction']
  export const getAppEntryCssElement: RscServerAdapter['getAppEntryCssElement']
  export const getDeploymentId: RscServerAdapter['getDeploymentId']
}

declare module 'virtual:bundler-adapter/ssr' {
  import type { RscSsrAdapter } from '../adapters/types.js'
  export const createFromReadableStream: RscSsrAdapter['createFromReadableStream']
  export const loadBootstrapScriptContent: RscSsrAdapter['loadBootstrapScriptContent']
  export const importRscEnvironment: RscSsrAdapter['importRscEnvironment']
}

declare module 'virtual:spiceflow-deployment-id' {
  const deploymentId: string | undefined
  export default deploymentId
}

declare module 'virtual:bundler-adapter/client' {
  import type { RscClientAdapter } from '../adapters/types.js'
  export const createFromReadableStream: RscClientAdapter['createFromReadableStream']
  export const createFromFetch: RscClientAdapter['createFromFetch']
  export const createTemporaryReferenceSet: RscClientAdapter['createTemporaryReferenceSet']
  export const encodeReply: RscClientAdapter['encodeReply']
  export const setServerCallback: RscClientAdapter['setServerCallback']
  export const onHmrUpdate: RscClientAdapter['onHmrUpdate']
  export const onHmrError: RscClientAdapter['onHmrError']
}
