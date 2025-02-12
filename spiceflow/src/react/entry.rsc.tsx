
import app from 'virtual:app-entry'

export interface RscHandlerResult {
  stream: ReadableStream<Uint8Array>
}

export async function handler(url: URL, request: Request) {
  // handle action
 
  const response = await app.handle(request)
  
  return response
}