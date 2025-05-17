import { SSEServerTransportCloudflare } from './cloudflare.js'

/**
 * Creates a new SSE server transport for Cloudflare Workers
 * 
 * @param endpoint The endpoint to direct clients to POST messages to
 * @returns A Cloudflare Workers-specific implementation of the SSE server transport
 */
export function createSSEServerTransport(endpoint: string): SSEServerTransportCloudflare {
  return new SSEServerTransportCloudflare(endpoint)
}
