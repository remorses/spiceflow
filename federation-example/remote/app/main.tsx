import { Spiceflow } from 'spiceflow'
import { cors } from 'spiceflow/cors'
import { Chart } from './chart'
import { renderComponentPayload } from 'spiceflow/federation'

export const app = new Spiceflow()
  .use(cors({ origin: '*' }))
  .get('/api/chart', async ({ request }) => {
    const url = new URL(request.url)
    let props: Record<string, unknown> = {}
    try {
      props = JSON.parse(url.searchParams.get('props') || '{}')
    } catch {
      // invalid JSON, use empty props
    }

    const payload = await renderComponentPayload(
      <Chart {...props} />,
    )

    return new Response(JSON.stringify(payload), {
      headers: {
        'content-type': 'application/json',
        'access-control-allow-origin': '*',
      },
    })
  })

app.listen(Number(process.env.PORT || 3001))
