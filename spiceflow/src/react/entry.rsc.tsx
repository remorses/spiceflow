import type { ReactFormState } from 'react-dom/client'
import React from 'react'
import ReactServer from 'spiceflow/dist/react/server-dom-optimized'

import type {
  ClientReferenceMetadataManifest,
  ServerReferenceManifest,
} from './types/index.js'
import app from 'virtual:app-entry'
import { fromPipeableToWebReadable } from './utils/fetch.js'
import { FlightData } from './components.js'

export interface RscHandlerResult {
  stream: ReadableStream<Uint8Array>
}

export async function handler(url: URL, request: Request) {
  // handle action
 
  const response = await app.handle(request)
  
  return response
}