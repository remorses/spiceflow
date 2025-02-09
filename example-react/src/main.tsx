import { Spiceflow } from 'spiceflow'
import { IndexPage } from './app/index'
import { Layout } from './app/layout'

const app = new Spiceflow()
  .react('/', ({ request }) => {
    const url = new URL(request.url)
    return (
      <Layout>
        <IndexPage url={url} />
      </Layout>
    )
  })
  .get('/hello', () => 'Hello, World!')
  .post('/echo', async ({ request }) => {
    const body = await request.json()
    return { echo: body }
  })

export default app
