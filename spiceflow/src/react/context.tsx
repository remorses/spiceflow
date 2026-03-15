import React from "react"
import { ServerPayload } from "../spiceflow.js"

export const FlightDataContext = React.createContext<Promise<ServerPayload>>(
  undefined!,
)

// Get $$id property that was set by registerClientReference

export function useFlightData() {
  const c = React.useContext(FlightDataContext)

  if (!c) {
    throw new Error(
      '[spiceflow] FlightDataContext is missing. This usually means the ' +
      'spiceflow module was loaded twice (e.g. one copy bundled by Vite dep ' +
      'optimizer and another loaded raw from node_modules). Make sure ' +
      '"spiceflow" is in optimizeDeps.exclude for the client environment.',
    )
  }

  const payload = React.use(c)
  return payload?.root
}
