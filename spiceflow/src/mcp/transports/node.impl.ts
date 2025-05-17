import { SSEServerTransportNode } from './node.js'

/**
 * Creates a new SSE server transport for Node.js
 * 
 * @param endpoint The endpoint to direct clients to POST messages to
 * @returns A Node.js-specific implementation of the SSE server transport
 */
export function createSSEServerTransport(endpoint: string): SSEServerTransportNode {
  return new SSEServerTransportNode(endpoint)
}
