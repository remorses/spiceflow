import React from 'react'
import type { ServerPayload } from '../spiceflow.js'
import type { RouterContextData } from '../router-context.js'

export type FlightDataContextValue = {
  payload: Promise<ServerPayload>
  routerData: RouterContextData
}

export const FlightDataContext = React.createContext<
  FlightDataContextValue | undefined
>(undefined)
