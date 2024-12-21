import { Spiceflow } from '../src'
import { z } from 'zod'
import { openapi } from '../src/openapi.js'

const app = new Spiceflow()
  .use(
    openapi({
      additional: {
        components: {
          securitySchemes: {
            // https://buildwithfern.com/learn/api-definition/openapi/authentication
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
              description: 'Enter your JWT token',
            },
          },
        },
      },
    }),
  )
  .use(async (c, next) => {
    if (c.path === '/openapi') {
      return next()
    }
    const auth = c.request.headers.get('authorization')
    if (!auth) {
      throw new Response('Unauthorized', {
        headers: {
          'content-type': 'text/plain',
        },
        status: 401,
      })
    }
    return next()
  })
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
      detail: {},
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
      response: z.object({
        message: z.string(),
        data: z.any(),
      }),
    },
  )
//   .post(
//     '/upload',
//     async (c) => {
//       const formData = await c.request.formData()
//       const file = formData.get('file')
//       return {
//         message: 'File uploaded',
//         filename: file instanceof File ? file.name : 'unknown',
//       }
//     },
//     {
//       body: z.object({
//         file: z.instanceof(File),
//       }),

//       //   type: 'formdata',
//     },
//   )

export { app }
