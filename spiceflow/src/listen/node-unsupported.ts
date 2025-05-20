import type { Spiceflow } from 'spiceflow'

export async function listen(
  app: Spiceflow<any, any, any, any, any, any>,
  port: number,
  hostname: string = '0.0.0.0',
): Promise<void> {
  throw new Error(
    "Current runtime does not support 'listenForNode'. Consider using the method 'listen' if supported, or else the method 'handle' directly.",
  )
}
