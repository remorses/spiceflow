// Fallback for non-RSC environments. Using federation APIs outside the RSC
// environment is not supported.

function unavailable(): never {
  throw new Error(
    '[spiceflow] Federation APIs are only available in the react-server environment. ' +
      'encodeFederationPayload must be called from a spiceflow route handler inside a Vite RSC build.',
  )
}

export const renderToReadableStream: any = unavailable
export const renderToStaticMarkup: (...args: any[]) => Promise<string> = unavailable
export const encodeFederationPayload: (...args: any[]) => Promise<Response> = unavailable
export const renderFlightPayload: (...args: any[]) => Promise<Response> = unavailable
export const renderComponentPayload: (...args: any[]) => Promise<Response> = unavailable
