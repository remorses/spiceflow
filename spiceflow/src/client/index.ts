import type { SpiceflowClient } from './types.js'

export { SpiceflowClient }

import { streamSSEResponse, TextDecoderStream } from './shared.ts'

export { streamSSEResponse, TextDecoderStream }

export { createSpiceflowFetch } from './fetch.ts'
export type { SpiceflowFetch } from './fetch.ts'
export { SpiceflowFetchError } from './errors.ts'
export { installWebMcp } from './webmcp.ts'
export type {
  InstallWebMcpOptions,
  WebMcpRouteFilter,
  WebMcpTool,
} from './webmcp.ts'
