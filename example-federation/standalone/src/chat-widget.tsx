// Chat widget that consumes streaming federation payloads from a remote
// spiceflow server. Demonstrates async generator streaming + client component
// hydration in a plain React SPA.
import { useState, type ReactNode } from 'react'
import {
  decodeFederationPayloadDetails,
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

      const decoded = await decodeFederationPayloadDetails<{
        stream: AsyncIterable<ChatPart>
      }>(response)

      const parts: ReactNode[] = []
      for await (const part of decoded.value.stream) {
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
      const decoded = await decodeFederationPayloadDetails<ReactNode>(response)
      setChartNode(decoded.value)
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
        {chartNode && <div data-testid="chart-container">{chartNode}</div>}
      </div>

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
