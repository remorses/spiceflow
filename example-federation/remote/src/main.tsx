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

void app.listen(Number(process.env.PORT || 3001))

declare module 'spiceflow/react' {
  interface SpiceflowRegister { app: typeof app }
}
