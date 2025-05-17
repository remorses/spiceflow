import { SSEServerTransportBun } from './bun.js'

/**
 * Creates a new SSE server transport for Bun
 * 
 * @param endpoint The endpoint to direct clients to POST messages to
 * @returns A Bun-specific implementation of the SSE server transport
 */
export function createSSEServerTransport(endpoint: string): SSEServerTransportBun {
  return new SSEServerTransportBun(endpoint)
}
