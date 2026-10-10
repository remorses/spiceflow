// Custom entry: mounts holocron docs with a few extra routes.
// Holocron handles the docs rendering (including /llms.txt);
// this file adds the /gh redirect.

import { env } from 'cloudflare:workers'
import { Spiceflow } from 'spiceflow'
import { serveAssets } from 'spiceflow/cloudflare'
import { app as holocronApp } from '@holocron.so/vite/app'

export const app = new Spiceflow()
  // Runs before prerendered staticPage routes too (assets.run_worker_first).
  .use(async (_, next) => {
    const response = await next()
    response.headers.set('x-spiceflow-middleware', '1')
    return response
  })
  .use(serveAssets(env.ASSETS))
  .get('/gh', ({ request }) => {
    return Response.redirect('https://github.com/remorses/spiceflow', 302)
  })
  .staticPage('/static-test', async () => {
    return (
      <html>
        <body>
          <p>Static test page, prerendered at build time.</p>
        </body>
      </html>
    )
  })
  .use(holocronApp)

export default {
  async fetch(request: Request): Promise<Response> {
    return app.handle(request)
  },
}
