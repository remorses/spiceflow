// MCP server factory. Creates a new McpServer instance with tools and resources
// registered. Each HTTP request gets its own instance because McpServer only
// supports one transport at a time.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import type {
  CallToolResult,
  ReadResourceResult,
} from '@modelcontextprotocol/sdk/types.js'
import {
  registerAppTool,
  registerAppResource,
  RESOURCE_MIME_TYPE,
} from '@modelcontextprotocol/ext-apps/server'
import { z } from 'zod'
import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

interface NominatimResult {
  place_id: number
  lat: string
  lon: string
  display_name: string
  boundingbox: [string, string, string, string]
  type: string
  importance: number
}

let lastNominatimRequest = 0
const NOMINATIM_RATE_LIMIT_MS = 1100

async function geocode(query: string): Promise<NominatimResult[]> {
  const now = Date.now()
  const wait = NOMINATIM_RATE_LIMIT_MS - (now - lastNominatimRequest)
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  lastNominatimRequest = Date.now()

  const params = new URLSearchParams({ q: query, format: 'json', limit: '5' })
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    {
      headers: {
        'User-Agent': 'Spiceflow-MCP-Example/1.0 (https://github.com/remorses/spiceflow)',
      },
    },
  )
  if (!res.ok) throw new Error(`Nominatim ${res.status} ${res.statusText}`)
  return res.json() as Promise<NominatimResult[]>
}

// Resolve the dist directory for the pre-built MCP App UI HTML.
// In dev we read from dist-mcp-ui/ (built by `pnpm build:mcp-ui`).
function getMcpUiDistDir(): string {
  return path.join(import.meta.dirname, '..', 'dist-mcp-ui')
}

const RESOURCE_URI = 'ui://spiceflow-map/mcp-app.html'

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: 'Spiceflow Map Server',
    version: '1.0.0',
  })

  const cspMeta = {
    ui: {
      csp: {
        connectDomains: ['https://*.openstreetmap.org'],
        resourceDomains: [
          'https://*.openstreetmap.org',
          'https://unpkg.com',
        ],
      },
    },
  }

  // Serve the bundled single-file HTML as an MCP resource
  registerAppResource(
    server,
    RESOURCE_URI,
    RESOURCE_URI,
    { mimeType: RESOURCE_MIME_TYPE },
    async (): Promise<ReadResourceResult> => {
      const html = await fs.readFile(
        path.join(getMcpUiDistDir(), 'mcp-app.html'),
        'utf-8',
      )
      return {
        contents: [
          {
            uri: RESOURCE_URI,
            mimeType: RESOURCE_MIME_TYPE,
            text: html,
            _meta: cspMeta,
          },
        ],
      }
    },
  )

  // show-map tool: displays the interactive Leaflet map
  registerAppTool(
    server,
    'show-map',
    {
      title: 'Show Map',
      description:
        'Display an interactive map zoomed to a bounding box. Use the geocode tool first to find coordinates.',
      inputSchema: {
        west: z.number().optional().default(-0.5).describe('Western longitude'),
        south: z.number().optional().default(51.3).describe('Southern latitude'),
        east: z.number().optional().default(0.3).describe('Eastern longitude'),
        north: z.number().optional().default(51.7).describe('Northern latitude'),
        label: z.string().optional().describe('Label to display on the map'),
      },
      _meta: { ui: { resourceUri: RESOURCE_URI } },
    },
    async ({ west, south, east, north, label }): Promise<CallToolResult> => ({
      content: [
        {
          type: 'text',
          text: `Map: W:${west.toFixed(4)}, S:${south.toFixed(4)}, E:${east.toFixed(4)}, N:${north.toFixed(4)}${label ? ` (${label})` : ''}`,
        },
      ],
      _meta: { viewUUID: randomUUID() },
    }),
  )

  // geocode tool: search for places (no UI)
  server.registerTool(
    'geocode',
    {
      title: 'Geocode',
      description:
        'Search for places using OpenStreetMap. Returns coordinates and bounding boxes.',
      inputSchema: {
        query: z.string().describe('Place name or address to search for'),
      },
    },
    async ({ query }): Promise<CallToolResult> => {
      try {
        const results = await geocode(query)
        if (results.length === 0) {
          return {
            content: [{ type: 'text', text: `No results for "${query}"` }],
          }
        }

        const formatted = results.map((r) => ({
          name: r.display_name,
          lat: parseFloat(r.lat),
          lon: parseFloat(r.lon),
          bbox: {
            south: parseFloat(r.boundingbox[0]),
            north: parseFloat(r.boundingbox[1]),
            west: parseFloat(r.boundingbox[2]),
            east: parseFloat(r.boundingbox[3]),
          },
        }))

        const text = formatted
          .map(
            (r, i) =>
              `${i + 1}. ${r.name}\n   [${r.lat.toFixed(6)}, ${r.lon.toFixed(6)}]\n   bbox: W:${r.bbox.west.toFixed(4)} S:${r.bbox.south.toFixed(4)} E:${r.bbox.east.toFixed(4)} N:${r.bbox.north.toFixed(4)}`,
          )
          .join('\n\n')

        return { content: [{ type: 'text', text }] }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Geocoding error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        }
      }
    },
  )

  return server
}
