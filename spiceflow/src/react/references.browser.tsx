import { createServerReference as createServerReferenceImp } from '@jacob-ebey/react-server-dom-vite/client'

export function createServerReference(imp: unknown, id: string, name: string) {
  return createServerReferenceImp(`${id}#${name}`, __callServer)
}
