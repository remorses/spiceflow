// Fallback for non-RSC environments. Resolved via package.json #deployment-id
// import map under the "default" condition. Returns '' since the Vite virtual
// module is not available outside of Vite RSC builds.

export async function getDeploymentId(): Promise<string> {
  return ''
}
