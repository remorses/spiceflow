export async function listenForNode(options: {
  handler: unknown
  port: number
  hostname?: string
  noStackTraces?: boolean
}) {
  throw new Error(
    "Current runtime does not support the method 'listen' with node:http. Consider using the method 'handle' with your runtime's server primitive instead.",
  )
}

export async function handleForNode(
  app: unknown,
  req: unknown,
  res: unknown,
  context: { state?: {} | undefined } = {},
): Promise<void> {
  throw new Error(
    "Current runtime does not support the method 'handleForNode'. Consider using the method 'handle' instead.",
  )
}
