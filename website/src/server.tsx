// Custom entry: mounts holocron docs with a few extra routes.
// Holocron handles the docs rendering; this file adds /llms.txt
// and /gh redirect.

import { Spiceflow } from 'spiceflow'
import { app as holocronApp } from '@holocron.so/vite/app'
import readmeRaw from '../../README.md?raw'

export const app = new Spiceflow()
  .get('/llms.txt', () => {
    return new Response(readmeRaw, {
      headers: { 'Content-Type': 'text/plain' },
    })
  })
  .get('/gh', ({ request }) => {
    return Response.redirect('https://github.com/remorses/spiceflow', 302)
  })
  .use(holocronApp)

export default {
  async fetch(request: Request): Promise<Response> {
    return app.handle(request)
  },
}
