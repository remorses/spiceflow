import type React from 'react'
import type { ServerPayload } from '../spiceflow.js'

export const FlightDataContext = null as React.Context<
  Promise<ServerPayload> | undefined
> | null
