// RSC-environment deployment id loader. Returns the build timestamp set by
// the Vite plugin. Resolved via package.json #deployment-id import map under
// the "react-server" condition — only runs inside Vite RSC builds.

let deploymentIdPromise: Promise<string> | undefined

export async function getDeploymentId(): Promise<string> {
  if (!deploymentIdPromise) {
    deploymentIdPromise = loadRuntimeDeploymentId()
  }
  return deploymentIdPromise
}

async function loadRuntimeDeploymentId(): Promise<string> {
  if (import.meta.hot) return ''
  try {
    const { default: id } = await import('virtual:spiceflow-deployment-id')
    return id ?? ''
  } catch {
    return ''
  }
}
