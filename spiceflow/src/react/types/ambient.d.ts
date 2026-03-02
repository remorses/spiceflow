/// <reference types="vite/client" />
/// <reference types="@vitejs/plugin-rsc/types" />

declare module 'virtual:app-styles' {
  const cssUrls: string[]
  export default cssUrls
}

declare module 'virtual:app-entry' {
  import type { Spiceflow } from 'spiceflow'
  const app: Spiceflow
  export default app
}
