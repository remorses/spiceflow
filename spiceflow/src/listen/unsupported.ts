import type { Spiceflow } from 'spiceflow'

export async function listen(
  app: Spiceflow<any, any, any, any, any, any>,
  port: number,
  hostname: string = '0.0.0.0',
): Promise<void> {
  throw new Error(
    "Current runtime does not support 'listen'. Consider using the method 'handle' directly.",
  )
}
