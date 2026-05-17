export async function listenForNode(
  app: unknown,
  port: number,
  hostname: string = '0.0.0.0',
) {
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
