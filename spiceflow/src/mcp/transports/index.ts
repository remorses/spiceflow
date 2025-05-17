import { SSEServerTransportBase } from './base.js'

/**
 * SSE server transport factory
 * 
 * This is a placeholder that will be replaced by the appropriate runtime implementation
 * via package.json conditional exports
 */
export function createSSEServerTransport(endpoint: string): SSEServerTransportBase {
  throw new Error('SSE transport not available for this runtime')
}

// Re-export the base class
export { SSEServerTransportBase } from './base.js'
