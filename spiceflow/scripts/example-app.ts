import { Spiceflow } from 'spiceflow'
import { z } from 'zod'
import { openapi } from 'spiceflow/openapi'

const app = new Spiceflow()
  .use(openapi())
  .get('/', () => 'Hello World')
  .get(
    '/stream',
    async function* () {
      for (let i = 0; i < 5; i++) {
        yield { count: i, timestamp: Date.now() }
        await new Promise((resolve) => setTimeout(resolve, 10))
      }
    },
    {
      response: z.object({
        count: z.number(),
        timestamp: z.number(),
      }),
    },
  )
  .get('/users/:id', (c) => {
    return {
      id: c.params.id,
      name: c.query.name || 'Anonymous',
    }
  })
  .post(
    '/users',
    async (c) => {
      const body = await c.request.json()
      return {
        message: 'User created',
        data: body,
      }
    },
    {
      body: z.object({
        name: z.string(),
        email: z.string().email(),
        age: z.number().min(0).max(120),
      }),
    },
  )
  .post(
    '/upload',
    async (c) => {
      const formData = await c.request.formData()
      const file = formData.get('file')
      return {
        message: 'File uploaded',
        filename: file instanceof File ? file.name : 'unknown',
      }
    },
    {
      type: 'formdata',
    },
  )

export { app }
