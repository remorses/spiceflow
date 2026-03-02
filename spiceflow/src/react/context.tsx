import React from "react"
import { ServerPayload } from "../spiceflow.js"

export const FlightDataContext = React.createContext<Promise<ServerPayload>>(
  undefined!,
)

// Get $$id property that was set by registerClientReference

export function useFlightData() {
  const c = React.useContext(FlightDataContext)

  const payload = React.use(c)
  let root = payload?.root
  if (!root) {
    console.log('root not found', payload)
  }
  return root

  // return React.useContext(FlightDataContext)
}
