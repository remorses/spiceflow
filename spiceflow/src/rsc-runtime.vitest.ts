// Vitest-environment RSC runtime shim. Resolved via package.json #rsc-runtime
// import map under the "spiceflow-vitest" condition. Bypasses RSC Flight
// serialization so route handlers return JSX directly via SpiceflowTestResponse.
// Server actions and Flight decoding are not supported in this mode.

function unavailableInVitest(name: string): never {
  throw new Error(
    `[spiceflow] ${name} is not available in vitest mode. ` +
      'Server actions and RSC Flight serialization require a full Vite RSC build. ' +
      'Use app.handle() for route and loader testing only.',
  )
}

export const __spiceflowVitestMode = true

export const renderToReadableStream: any = () => unavailableInVitest('renderToReadableStream')
export const createTemporaryReferenceSet: any = () => undefined
export const decodeReply: any = () => unavailableInVitest('decodeReply')
export const decodeAction: any = () => unavailableInVitest('decodeAction')
export const decodeFormState: any = () => unavailableInVitest('decodeFormState')
export const loadServerAction: any = () => unavailableInVitest('loadServerAction')
