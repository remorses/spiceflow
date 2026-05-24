// Split sub-app: loaded on demand when a request matches /admin/*
// On Cloudflare, this runs as an isolated Dynamic Worker via LOADER.
// Cloudflare bindings (KV, D1, R2) are not available in Dynamic Workers
// because they are not structured-clonable. Use outbound fetch() for
// external API calls instead.
import { Spiceflow } from 'spiceflow'
import { formatUser, getDefaultUsers } from './admin-utils'
import { timestamp } from './shared-helpers'

export default new Spiceflow()
  .get('/users', () => ({
    users: getDefaultUsers(),
  }))
  .get('/users/:id', ({ params }) => ({
    user: formatUser(params.id, `User ${params.id}`),
  }))
  .get('/stats', () => ({
    totalUsers: 42,
    activeUsers: 18,
    timestamp: timestamp(),
  }))
