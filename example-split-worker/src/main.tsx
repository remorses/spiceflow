// Example: Spiceflow with lazy sub-apps using ?split for Cloudflare Dynamic Workers.
// On Node/Bun the sub-apps load via regular dynamic import.
// On Cloudflare they run as isolated Dynamic Workers via the LOADER binding.
import { Spiceflow } from 'spiceflow'

export const app = new Spiceflow()
  .get('/', () => ({ message: 'root app' }))
  .get('/health', () => ({ status: 'ok' }))
  .lazy('/admin/*', () => import('./admin?split'))
  .lazy('/billing/*', () => import('./billing?split'))

export default {
  async fetch(request: Request) {
    return app.handle(request)
  },
}
