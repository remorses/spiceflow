// Lazy sub-app: loaded on demand when a request matches /billing/*
import { Spiceflow } from 'spiceflow'
import { timestamp } from './shared-helpers'

export default new Spiceflow()
  .get('/invoices', () => ({
    invoices: [
      { id: 'inv_001', amount: 99.99 },
      { id: 'inv_002', amount: 249.0 },
    ],
  }))
  .get('/invoices/:id', ({ params }) => ({
    invoice: { id: params.id, amount: 100, timestamp: timestamp() },
  }))
