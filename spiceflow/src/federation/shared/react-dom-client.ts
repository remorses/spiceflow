import * as ReactDOMClient from 'react-dom/client'

export { default, createRoot, hydrateRoot } from 'react-dom/client'

// Not in @types/react-dom/client, but part of the runtime exports
export const version = Reflect.get(ReactDOMClient, 'version')
