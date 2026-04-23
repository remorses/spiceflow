// MCP App UI that renders inside a sandboxed iframe in Claude, ChatGPT, etc.
// Uses Leaflet for the map and @modelcontextprotocol/ext-apps for host communication.
import { StrictMode, useCallback, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { useApp } from '@modelcontextprotocol/ext-apps/react'
import type {
  App,
  McpUiHostContext,
} from '@modelcontextprotocol/ext-apps'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'

// Leaflet loaded from CDN (declared globally)
declare const L: typeof import('leaflet')

const PREFERRED_HEIGHT = 400

async function loadLeaflet(): Promise<void> {
  if (typeof L !== 'undefined') return
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Leaflet'))
    document.head.appendChild(script)
  })
}

interface BoundingBox {
  west: number
  south: number
  east: number
  north: number
}

function extractText(result: CallToolResult): string {
  return result.content?.find((c) => c.type === 'text')?.text ?? ''
}

// ---------------------------------------------------------------------------
// Map component
// ---------------------------------------------------------------------------

function MapView({
  app,
  initialBbox,
  label,
}: {
  app: App
  initialBbox: BoundingBox | null
  label?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  // Initialize the map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    })

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)

    // Default view: world
    map.setView([20, 0], 2)
    mapRef.current = map

    // Let the host know our preferred size
    app.sendSizeChanged({ height: PREFERRED_HEIGHT })

    // Camera move updates model context
    map.on('moveend', () => {
      const center = map.getCenter()
      const bounds = map.getBounds()
      app.updateModelContext({
        content: [
          {
            type: 'text',
            text: `Map centered on [${center.lat.toFixed(4)}, ${center.lng.toFixed(4)}], zoom ${map.getZoom()}`,
          },
        ],
      })
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [app])

  // Fly to initial bbox when it arrives
  useEffect(() => {
    if (!initialBbox || !mapRef.current) return
    const { south, west, north, east } = initialBbox
    mapRef.current.fitBounds([
      [south, west],
      [north, east],
    ])
  }, [initialBbox])

  // Show label as a popup at center
  useEffect(() => {
    if (!label || !mapRef.current || !initialBbox) return
    const lat = (initialBbox.south + initialBbox.north) / 2
    const lng = (initialBbox.west + initialBbox.east) / 2
    L.popup()
      .setLatLng([lat, lng])
      .setContent(label)
      .openOn(mapRef.current)
  }, [label, initialBbox])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: PREFERRED_HEIGHT }}
    />
  )
}

// ---------------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------------

function McpMapApp() {
  const [bbox, setBbox] = useState<BoundingBox | null>(null)
  const [label, setLabel] = useState<string>()
  const [hostContext, setHostContext] = useState<McpUiHostContext>()
  const [leafletReady, setLeafletReady] = useState(false)
  const appRef = useRef<App | null>(null)

  const { app, error } = useApp({
    appInfo: { name: 'Spiceflow Map', version: '1.0.0' },
    capabilities: { tools: { listChanged: true } },
    autoResize: false,
    onAppCreated: (app) => {
      appRef.current = app

      app.ontoolinput = (params) => {
        const args = params.arguments as Record<string, unknown> | undefined
        if (!args) return
        if (
          args.west !== undefined &&
          args.south !== undefined &&
          args.east !== undefined &&
          args.north !== undefined
        ) {
          setBbox({
            west: args.west as number,
            south: args.south as number,
            east: args.east as number,
            north: args.north as number,
          })
          if (args.label) setLabel(args.label as string)
        }
      }

      app.ontoolresult = (result) => {
        console.log('[mcp-app] tool result:', result)
      }

      app.ontoolcancelled = (params) => {
        console.log('[mcp-app] cancelled:', params.reason)
      }

      app.onteardown = async () => {
        console.log('[mcp-app] teardown')
        return {}
      }

      app.onerror = console.error

      app.onhostcontextchanged = (ctx) => {
        setHostContext((prev) => ({ ...prev, ...ctx }))
      }

      // Register a tool the LLM can call to navigate the map
      app.registerTool(
        'navigate-to',
        {
          title: 'Navigate To',
          description: 'Pan the map to a new bounding box',
          inputSchema: z.object({
            west: z.number().describe('Western longitude'),
            south: z.number().describe('Southern latitude'),
            east: z.number().describe('Eastern longitude'),
            north: z.number().describe('Northern latitude'),
            label: z.string().optional().describe('Label to show'),
          }),
        },
        async (args) => {
          setBbox({
            west: args.west,
            south: args.south,
            east: args.east,
            north: args.north,
          })
          if (args.label) setLabel(args.label)
          return {
            content: [
              {
                type: 'text' as const,
                text: `Navigated to [${args.south},${args.west}]-[${args.north},${args.east}]`,
              },
            ],
          }
        },
      )
    },
  })

  // Load Leaflet from CDN
  useEffect(() => {
    loadLeaflet().then(() => setLeafletReady(true))
  }, [])

  useEffect(() => {
    if (app) setHostContext(app.getHostContext())
  }, [app])

  const handleGeocode = useCallback(
    async (query: string) => {
      if (!app) return
      const result = await app.callServerTool({
        name: 'geocode',
        arguments: { query },
      })
      console.log('[mcp-app] geocode result:', extractText(result))
    },
    [app],
  )

  if (error) {
    return (
      <div style={{ padding: 20, color: 'red' }}>
        <strong>Connection error:</strong> {error.message}
      </div>
    )
  }

  if (!app || !leafletReady) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: PREFERRED_HEIGHT,
          color: '#666',
        }}
      >
        Loading map...
      </div>
    )
  }

  return <MapView app={app} initialBbox={bbox} label={label} />
}

// ---------------------------------------------------------------------------
// Mount
// ---------------------------------------------------------------------------

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <McpMapApp />
  </StrictMode>,
)
