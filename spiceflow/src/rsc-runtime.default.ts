// Fallback for non-RSC environments. Resolved via package.json #rsc-runtime
// import map under the "default" condition. Does not import @vitejs/plugin-rsc
// so bundlers outside Vite can resolve the entry without errors.

function unavailable(): never {
  throw new Error(
    '[spiceflow] RSC runtime is only available in the react-server environment. ' +
    'This error means renderReact was called outside of a Vite RSC build.',
  )
}

export const renderToReadableStream: any = unavailable
export const createTemporaryReferenceSet: any = unavailable
export const decodeReply: any = unavailable
export const decodeAction: any = unavailable
export const decodeFormState: any = unavailable
export const loadServerAction: any = unavailable
