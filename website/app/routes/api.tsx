import { useLoaderData } from 'react-router'

import { Spiceflow } from 'spiceflow'

const app = new Spiceflow({ basePath: '/api' })
  .get('/', () => 'Hello, World!')
  .get('/hello', () => 'Hello, World!')
  .post('/echo', async ({ request }) => {
    const body = await request.json()
    return { echo: body }
  })

export const loader = ({request}) => app.handle(request)
export const action = ({request}) => app.handle(request)
