/**
 * @fileoverview
 * This file is now a facade that imports the appropriate transport implementation
 * based on the current runtime environment.
 * 
 * The actual implementations are in the mcp/transports directory.
 */

// Re-export the createSSEServerTransport function and base class from the runtime-specific implementation
export { createSSEServerTransport, SSEServerTransportBase } from './mcp/transports/index.js'

// For backward compatibility
import { createSSEServerTransport } from './mcp/transports/index.js'

/**
 * @deprecated Use imports from 'spiceflow/mcp/transports' instead
 */
export class SSEServerTransportSpiceflow {
  // This class maintains backward compatibility
  constructor(endpoint: string) {
    console.warn('SSEServerTransportSpiceflow is deprecated, use createSSEServerTransport from spiceflow/mcp/transports instead')
    return createSSEServerTransport(endpoint) as any
  }
}
