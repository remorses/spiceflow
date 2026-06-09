// Chat widget that consumes streaming federation payloads from a remote
// spiceflow server. Demonstrates async generator streaming + client component
// hydration in a plain React SPA. Also includes a shadow DOM chart component
// that renders federated content inside a shadow root for style isolation.
import { useState, useRef, useLayoutEffect, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import {
  decodeFederationPayload,
  decodeFederationPayloadDetails,
  resolveFederatedUrl,
} from 'spiceflow/federation-client'

const remoteOrigin = 'http://localhost:3051'

interface ChatPart {
  type: 'text'
  content: ReactNode
}

interface ChatMessage {
  role: 'user' | 'assistant'
  text?: string
  parts: ReactNode[]
}

export function ChatWidget() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [chartNode, setChartNode] = useState<ReactNode>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const message = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text: message, parts: [] }])
    setLoading(true)

    try {
      const response = await fetch(
        `${remoteOrigin}/api/chat?message=${encodeURIComponent(message)}`,
      )

      const decoded = await decodeFederationPayload<{
        stream: AsyncIterable<ChatPart>
      }>(response)

      const parts: ReactNode[] = []
      for await (const part of decoded.stream) {
        parts.push(part.content)
        const updatedParts = [...parts]
        setMessages((prev) => {
          const last = prev.at(-1)
          if (last?.role === 'assistant') {
            return [...prev.slice(0, -1), { role: 'assistant', parts: updatedParts }]
          }
          return [...prev, { role: 'assistant', parts: updatedParts }]
        })
      }
    } catch (error) {
      console.error('Chat error:', error)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', parts: [], text: `Error: ${error}` },
      ])
    } finally {
      setLoading(false)
    }
  }

  async function handleLoadChart() {
    setLoading(true)
    try {
      const response = await fetch(`${remoteOrigin}/api/chart`)
      const chartNode = await decodeFederationPayload<ReactNode>(response)
      setChartNode(chartNode)
    } catch (error) {
      console.error('Chart error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div data-testid="chat-widget" style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 600, margin: '0 auto', padding: 20 }}>
      <h1>Standalone Federation Consumer</h1>

      <div data-testid="chart-section">
        <button data-testid="load-chart" onClick={handleLoadChart} disabled={loading}>
          Load Remote Chart
        </button>
        {chartNode !== null && <div data-testid="chart-container">{chartNode}</div>}
      </div>

      <hr style={{ margin: '20px 0' }} />
      <ShadowDomChart />

      <hr style={{ margin: '20px 0' }} />

      <div data-testid="chat-messages" style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 200 }}>
        {messages.map((msg, i) => (
          <div key={i} data-testid={`message-${msg.role}`}>
            {msg.text && <div>{msg.text}</div>}
            {msg.parts.map((part, j) => (
              <div key={j} data-testid={`part-${j}`}>{part}</div>
            ))}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <input
          data-testid="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={loading}
          style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
        />
        <button
          data-testid="chat-submit"
          type="submit"
          disabled={loading}
          style={{ padding: '8px 16px', borderRadius: 8, background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer' }}
        >
          {loading ? 'Loading...' : 'Send'}
        </button>
      </form>
    </div>
  )
}

// Renders a federated chart inside a shadow DOM for style isolation.
// Uses decodeFederationPayloadDetails with injectCss: false to prevent
// CSS from going into document.head, then manually injects <link> tags
// into the shadow root so styles only apply inside the shadow boundary.
function ShadowDomChart() {
  const hostRef = useRef<HTMLDivElement>(null)
  const rootRef = useRef<Root | null>(null)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  async function handleLoad() {
    const host = hostRef.current
    if (!host || loading) return
    setLoading(true)

    try {
      const response = await fetch(`${remoteOrigin}/api/chart`)
      const { value, metadata, remoteOrigin: origin } =
        await decodeFederationPayloadDetails<ReactNode>(response, {
          injectCss: false,
        })

      const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' })

      // Inject CSS links into the shadow root instead of document.head
      const allCss = new Set<string>()
      for (const href of metadata.cssLinks) {
        allCss.add(resolveFederatedUrl(href, origin))
      }
      for (const mod of Object.values(metadata.clientModules)) {
        for (const href of mod.css ?? []) {
          allCss.add(resolveFederatedUrl(href, origin))
        }
      }

      const cssPromises: Promise<void>[] = []
      for (const href of allCss) {
        if (shadow.querySelector(`link[href="${CSS.escape(href)}"]`)) continue
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.href = href
        cssPromises.push(
          new Promise<void>((resolve) => {
            link.onload = () => resolve()
            link.onerror = () => resolve()
          }),
        )
        shadow.appendChild(link)
      }
      await Promise.all(cssPromises)

      // Create or reuse the mount point
      let mountPoint = shadow.querySelector<HTMLDivElement>('[data-mount]')
      if (!mountPoint) {
        mountPoint = document.createElement('div')
        mountPoint.setAttribute('data-mount', '')
        shadow.appendChild(mountPoint)
      }

      // Render federated content into shadow DOM
      if (!rootRef.current) {
        rootRef.current = createRoot(mountPoint)
      }
      rootRef.current.render(value as ReactNode)
      setLoaded(true)
    } catch (error) {
      console.error('Shadow DOM chart error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div data-testid="shadow-chart-section">
      <button
        data-testid="load-shadow-chart"
        onClick={handleLoad}
        disabled={loading}
      >
        {loading ? 'Loading...' : loaded ? 'Loaded in Shadow DOM' : 'Load Chart in Shadow DOM'}
      </button>
      <div
        ref={hostRef}
        data-testid="shadow-chart-host"
        style={{ marginTop: 8 }}
      />
    </div>
  )
}
