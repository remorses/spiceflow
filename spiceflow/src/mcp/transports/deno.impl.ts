import { SSEServerTransportDeno } from './deno.js'

/**
 * Creates a new SSE server transport for Deno
 * 
 * @param endpoint The endpoint to direct clients to POST messages to
 * @returns A Deno-specific implementation of the SSE server transport
 */
export function createSSEServerTransport(endpoint: string): SSEServerTransportDeno {
  return new SSEServerTransportDeno(endpoint)
}
