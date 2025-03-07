import { useLoaderData } from 'react-router'

import { Spiceflow } from 'spiceflow'
import { mcp } from 'spiceflow/mcp'
import { openapi } from 'spiceflow/openapi'

const app = new Spiceflow({ basePath: '/api' })
  .use(openapi())
  .use(mcp({ path: '/mcp' }))
  .get('/', () => 'Hello, World!')
  .get('/hello', () => 'Hello, World!')
  .post('/echo', async ({ request }) => {
    const body = await request.json()
    return { echo: body }
  })
// console.log(app.getAllRoutes().map((x) => x.path))

export const loader = async ({ request }) => {
  const res = await app.handle(request)
  return res
}
export const action = ({ request }) => app.handle(request)
