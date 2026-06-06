import { Spiceflow } from 'spiceflow'
import { cors } from 'spiceflow/cors'
import { Chart } from './chart'
import { encodeFederationPayload } from 'spiceflow/federation'

// Minimal ESM module served as text/javascript for testing RenderFederatedPayload
// with plain JS files (e.g. esm.sh, Framer components).
const esmModuleSource = `
import { jsx } from "react/jsx-runtime";
export default function EsmGreeting(props) {
  return jsx("div", { "data-testid": "esm-greeting", children: "Hello from ESM: " + (props.name || "world") });
}
`

export const app = new Spiceflow()
  .use(cors({ origin: '*' }))
  .get('/api/esm-component.js', () => {
    return new Response(esmModuleSource, {
      headers: {
        'content-type': 'text/javascript',
        'access-control-allow-origin': '*',
      },
    })
  })
  .get('/api/chart', async ({ request }) => {
    const url = new URL(request.url)
    let props: Record<string, unknown> = {}
	try {
	  props = JSON.parse(url.searchParams.get('props') || '{}')
	} catch {
	  // invalid JSON, use empty props
	}

	return await encodeFederationPayload(<Chart {...props} />)
  })

  .get('/api/chat', async ({ request }) => {
    const url = new URL(request.url)
    const message = url.searchParams.get('message') || 'hello'

    // Simulate an AI chat response as a streaming async generator.
    // Uses server-rendered JSX (no client components) because streaming
    // federation emits metadata before client references are discovered.
    async function* generateParts() {
      const responses = [
        `I received your message: "${message}"`,
        'Let me think about that for a moment...',
        'Here is my detailed answer with **formatting**.',
      ]

      for (let i = 0; i < responses.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 100))
        yield {
          type: 'text' as const,
          content: (
            <div data-testid={`chat-part-${i}`} style={{
              padding: '12px 16px',
              borderRadius: '12px',
              background: '#f0f4ff',
              border: '1px solid #c7d2fe',
              margin: '4px 0',
              fontFamily: 'system-ui, sans-serif',
            }}>
              {responses[i]}
            </div>
          ),
        }
      }
    }

    return await encodeFederationPayload({ stream: generateParts() })
  })

void app.listen(Number(process.env.PORT || 3001))

declare module 'spiceflow/react' {
  interface SpiceflowRegister { app: typeof app }
}
