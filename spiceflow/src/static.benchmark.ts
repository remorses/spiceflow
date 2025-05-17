import { bench } from 'vitest'

import { Spiceflow } from './spiceflow.ts'
import { serveStatic } from './static-node.ts'

bench('Spiceflow static', async () => {
  const app = new Spiceflow()

  app
    .use(serveStatic({ root: '.' })) //
    .get('/hello', () => {
      return { message: 'Hello, World!' }
    })
    .get('/hellox', () => {
      return { message: 'Hello, World!' }
    })

  const request = new Request('http://localhost/src/cors.ts')
  for (let i = 0; i < 10000; i++) {
    await app.handle(request)
  }
})
