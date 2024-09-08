import { bench } from 'vitest'

import { Spiceflow } from './spiceflow.js'

bench('Spiceflow basic routing', async () => {
  const app = new Spiceflow()

  app.get('/hello', () => {
    return { message: 'Hello, World!' }
  })

  const request = new Request('http://localhost/hello')
  for (let i = 0; i < 10000; i++) {
    await app.handle(request)
  }
})
