import { Spiceflow } from 'spiceflow'

const app = new Spiceflow()
  .get('/', () => 'Hello, World!')
  .get('/hello', () => 'Hello, World!')
  .post('/echo', async ({ request }) => {
    const body = await request.json()
    return { echo: body }
  })

export default app
