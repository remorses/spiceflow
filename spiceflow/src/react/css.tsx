import { DevEnvironment, EnvironmentModuleNode, isCSSRequest } from 'vite'

export async function collectStyleUrls(
  server: DevEnvironment,
  { entries }: { entries: string[] },
) {
  const visited = new Set<EnvironmentModuleNode>()

  async function traverse(url: string) {
    const [, id] = await server.moduleGraph.resolveUrl(url)
    const mod = server.moduleGraph.getModuleById(id)
    if (!mod || visited.has(mod)) {
      return
    }
    visited.add(mod)
    await Promise.all(
      [...mod.importedModules].map((childMod) => traverse(childMod.url)),
    )
  }

  // ensure import analysis is ready for top entries
  await Promise.all(entries.map((e) => server.transformRequest(e)))

  // traverse
  await Promise.all(entries.map((url) => traverse(url)))

  return [...visited].map((mod) => mod.url).filter((url) => isCSSRequest(url))
}
