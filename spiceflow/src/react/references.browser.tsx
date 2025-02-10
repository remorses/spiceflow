import {
    createServerReference as createServerReferenceImp
} from 'react-server-dom-vite/client'



export function createServerReference(imp: unknown, id: string, name: string) {
  return createServerReferenceImp(`${id}#${name}`, __callServer)
}
