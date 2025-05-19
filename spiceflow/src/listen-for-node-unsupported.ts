import type { Spiceflow } from './spiceflow.ts'

export async function listenForNode(
  app: Spiceflow<any, any, any, any, any, any>,
  port: number,
  hostname: string = '0.0.0.0',
) {
  throw new Error(
    "Current runtime does not support listenForNode. Consider calling Spiceflow's request handler instead.",
  )
}
