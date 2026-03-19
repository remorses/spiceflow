// Deployment id loader. Returns the build timestamp set by the Vite plugin.
// Falls back to '' in dev or when the virtual module is unavailable.

let deploymentIdPromise: Promise<string> | undefined

export async function getDeploymentId(): Promise<string> {
  if (!deploymentIdPromise) {
    deploymentIdPromise = loadRuntimeDeploymentId()
  }
  return deploymentIdPromise
}

async function loadRuntimeDeploymentId(): Promise<string> {
  if (!import.meta.env.PROD) return ''
  try {
    const { default: id } = await import('virtual:spiceflow-deployment-id')
    return id ?? ''
  } catch {
    return ''
  }
}
