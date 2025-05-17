import { Spiceflow } from '../spiceflow.js'

export interface ServerOptions {
  port?: number
  hostname?: string
  development?: boolean
  onListen?: (address: string) => void
}

export interface Server {
  close: () => Promise<void>
  [key: string]: any
}

export interface ServeFunction {
  <T extends Spiceflow>(app: T, options?: ServerOptions): Promise<Server>
}

export const defaultServerOptions: ServerOptions = {
  port: 3000,
  hostname: '0.0.0.0',
  development: process.env.NODE_ENV !== 'production',
  onListen: (address) => console.log(`Server running at ${address}`)
}
