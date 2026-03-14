// Deployment id loader for the current bundler runtime.
// Falls back to undefined when the bundler adapter virtual module is unavailable.

let deploymentIdPromise: Promise<string | undefined> | undefined

export async function getRuntimeDeploymentId() {
  if (!deploymentIdPromise) {
    deploymentIdPromise = loadRuntimeDeploymentId()
  }
  return deploymentIdPromise
}

async function loadRuntimeDeploymentId() {
  let adapter: { getDeploymentId?: () => Promise<string | undefined> }
  try {
    adapter = await import('virtual:bundler-adapter/server')
  } catch {
    return undefined
  }

  return await adapter.getDeploymentId?.()
}
