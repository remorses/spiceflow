import { Spiceflow } from '../../../src/index.js'

/**
 * Creates a test API with common endpoints for testing across different runtimes
 */
export function createTestApi() {
  const app = new Spiceflow()
  
  // Simple hello world endpoint
  app.get('/', () => 'Hello World!')
  
  // JSON response endpoint
  app.get('/json', () => ({ message: 'Hello World!', success: true }))
  
  // Path parameter endpoint
  app.get('/users/:id', ({ params }) => {
    return { id: params.id, name: `User ${params.id}` }
  })
  
  // Query parameter endpoint
  app.get('/search', ({ query }) => {
    return { query: query.q, results: [`Result for ${query.q}`] }
  })
  
  // Post endpoint
  app.post('/echo', async ({ request }) => {
    const body = await request.json()
    return { echo: body }
  })
  
  // Stream response
  app.get('/stream', async () => {
    return new Response(
      new ReadableStream({
        async start(controller) {
          controller.enqueue('data: hello\n\n')
          controller.enqueue('data: world\n\n')
          controller.close()
        }
      }),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      }
    )
  })
  
  return app
}
