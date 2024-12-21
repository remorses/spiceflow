import { Spiceflow } from '../src'
import { z } from 'zod'
import { openapi } from '../src/openapi.js'

const app = new Spiceflow()
  .use(
    openapi({
      servers: [
        {
          url: 'https://api.com',
        },
      ],

      // 'x-fern-global-headers': [
      //   {
      //     header: 'Authorization',
      //     // optional: false,
      //     name: 'Authorization',
      //   },
      // ],
      security: [
        {
          bearerAuth: [],
        },
      ],
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
    }),
  )
  .use(async (c, next) => {
    if (c.path === '/openapi') {
      return next()
    }
    const auth = c.request.headers.get('authorization')
    if (!auth) {
      // throw new Response('Unauthorized', {
      //   headers: {
      //     'content-type': 'text/plain',
      //   },
      //   status: 401,
      // })
    }
    return next()
  })
  .get('/', () => 'Hello World', {
    detail: {
      'x-fern-sdk-group-name': 'one',
      'x-fern-sdk-method-name': 'take',
    },
  })
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
      detail: {
        tags: ['x'],
        summary: 'Stream Endpoint',
        description: `
        Returns an async generator when used in the sdk

        - Uses server sent events
        - But also has a response schema
        `,
      },
    },
  )
  .get(
    '/users/:id',
    (c) => {
      return {
        id: c.params.id,
        name: c.query.name || 'Anonymous',
      }
    },
    {
      detail: {
        tags: ['x'],
      },
    },
  )
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
      detail: {},
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
  .get(
    '/error',
    async () => {
      throw new Error('This is a test error')
    },
    {
      detail: {
        tags: ['x'],
        summary: 'Error Endpoint',
        description: 'Always throws an error for testing error handling',
      },
      // response: z.object({
      //   message: z.string(),
      // }),
    },
  )
  .get(
    '/errorWithSchema',
    async () => {
      throw new Error('This is a test error with schema too')
    },
    {
      detail: {
        tags: ['x'],
        description: 'Always throws an error for testing error handling',
      },
      response: z.object({
        message: z.string(),
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
      detail: {},
      body: z.object({
        file: z.string().base64(),
      }),
      bodyType: 'multipart/form-data',

      //   type: 'formdata',
    },
  )

export { app }
