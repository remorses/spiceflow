import React from 'react'
import type { ServerPayload } from '../spiceflow.js'

export const FlightDataContext = React.createContext<
  Promise<ServerPayload> | undefined
>(undefined)
