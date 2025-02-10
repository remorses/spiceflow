import type { ClientReferenceManifest } from '../types/index.js'

export const clientReferenceManifest: ClientReferenceManifest = {
  resolveClientReference(reference: string) {
    const [id, name] = reference.split('#')
    let resolved: unknown
    return {
      async preload() {
        let mod: Record<string, unknown>
        if (import.meta.env.DEV) {
          // console.log('importing client reference', id)
		  console.log('importing client reference', id)
          mod =
            typeof __raw_import !== 'undefined'
              ? // on browser development need to use __raw_import to not add ?import at the end, otherwise the browser duplicates the module instance, context stops working
                await __raw_import(/* @vite-ignore */ id)
              : await import(/* @vite-ignore */ id)
        } else {
          const references = await import(
            'virtual:build-client-references' as string
          )
		  const ref = references.default[id]
		  if (!ref) {
			throw new Error(`Can't find client reference for module ${id}, among ${Object.keys(references.default).join(', ')}`)
		  }
          mod = await ref()
        }
        resolved = mod[name]
      },
      get() {
        return resolved
      },
    }
  },
}
