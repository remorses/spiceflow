// Fallback for non-RSC environments. Using federation APIs outside the RSC
// environment is not supported.

function unavailable(): never {
  throw new Error(
    '[spiceflow] Federation APIs are only available in the react-server environment. ' +
      'renderComponentPayload must be called from a spiceflow route handler inside a Vite RSC build.',
  )
}

export const renderToReadableStream: any = unavailable
export const renderComponentPayload: any = unavailable
