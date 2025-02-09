import { Spiceflow } from 'spiceflow'
import { IndexPage } from './app/index'

const app = new Spiceflow()
  .react('/', ({ request}) => {
    const url = new URL(request.url)
    return <IndexPage url={url} />
  })
  .get('/hello', () => 'Hello, World!')
  .post('/echo', async ({ request }) => {
    const body = await request.json()
    return { echo: body }
  })

export default app
