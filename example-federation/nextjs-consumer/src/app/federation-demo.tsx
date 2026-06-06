// Client component that sets up the spiceflow federation consumer and
// renders remote components fetched from a spiceflow server. Demonstrates
// that federation works inside Next.js without any spiceflow framework deps.
'use client'

import { useState, useEffect, type ReactNode } from 'react'
import {
  decodeFederationPayload,
  setupFederationConsumer,
} from 'spiceflow/federation-client'

const remoteOrigin = 'http://localhost:3051'

let setupDone = false

async function ensureFederationSetup() {
  if (setupDone) return
  if (typeof window === 'undefined') return

  const React = await import('react')
  const ReactJsx = await import('react/jsx-runtime')
  const ReactDOM = await import('react-dom')
  const ReactDOMClient = await import('react-dom/client')
  const SpiceflowReact = await import('spiceflow/react')

  await setupFederationConsumer({
    modules: {
      'react': React,
      'react/jsx-runtime': ReactJsx,
      'react/jsx-dev-runtime': ReactJsx,
      'react-dom': ReactDOM,
      'react-dom/client': ReactDOMClient,
      'spiceflow/react': SpiceflowReact,
    },
  })

  setupDone = true
}

export function FederationDemo() {
  const [chartNode, setChartNode] = useState<ReactNode>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    ensureFederationSetup()
      .then(() => setReady(true))
      .catch((err) => {
        console.error('Federation setup failed:', err)
        setError(String(err))
      })
  }, [])

  async function handleLoadChart() {
    if (!ready) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${remoteOrigin}/api/chart`)
      const chartNode = await decodeFederationPayload<ReactNode>(response)
      setChartNode(chartNode)
    } catch (err) {
      console.error('Chart load error:', err)
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div data-testid="federation-demo">
      <div data-testid="chart-section">
        <button
          data-testid="load-chart"
          onClick={handleLoadChart}
          disabled={loading || !ready}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            background: ready ? '#3b82f6' : '#94a3b8',
            color: 'white',
            border: 'none',
            cursor: ready ? 'pointer' : 'not-allowed',
          }}
        >
          {!ready ? 'Initializing...' : loading ? 'Loading...' : 'Load Remote Chart'}
        </button>
        {error && (
          <div data-testid="error" style={{ color: 'red', marginTop: 8 }}>
            {error}
          </div>
        )}
        {chartNode && <div data-testid="chart-container">{chartNode}</div>}
      </div>
    </div>
  )
}
