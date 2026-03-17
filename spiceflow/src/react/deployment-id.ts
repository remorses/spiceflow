// Deployment id loader. Returns the build timestamp set by the Vite plugin.
// Falls back to undefined in dev or when the virtual module is unavailable.

let deploymentIdPromise: Promise<string | undefined> | undefined

export async function getRuntimeDeploymentId() {
  if (!deploymentIdPromise) {
    deploymentIdPromise = loadRuntimeDeploymentId()
  }
  return deploymentIdPromise
}

async function loadRuntimeDeploymentId() {
  if (!import.meta.env.PROD) return undefined
  try {
    const { default: id } = await import('virtual:spiceflow-deployment-id')
    return id ?? undefined
  } catch {
    return undefined
  }
}
