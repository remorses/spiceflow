import nodePath from 'node:path'
import { ModuleNode, ViteDevServer } from 'vite'

// Apply same noramlizaion as Vite's dev import analysis
// to avoid dual package with "/xyz" and "/@fs/xyz" for example.

// https://github.com/vitejs/vite/blob/0c0aeaeb3f12d2cdc3c47557da209416c8d48fb7/packages/vite/src/node/plugins/importAnalysis.ts#L327-L399
export function noramlizeClientReferenceId(
  id: string,
  parentServer: ViteDevServer,
  mod?: ModuleNode,
) {
  const root = parentServer.config.root
  if (id.startsWith(root)) {
    id = id.slice(root.length)
  } else if (nodePath.isAbsolute(id)) {
    id = '/@fs' + id
  } else {
    id = wrapId(id)
  }
  // this is needed only for browser, so we'll strip it off
  // during ssr client reference import
  // TODO

  if (mod && mod.lastHMRTimestamp > 0) {
    id += `?t=${mod.lastHMRTimestamp}`
  }
  return id
}

function wrapId(id: string) {
  return id.startsWith(`/@id`) ? id : `/@id/${id.replace('\0', '__x00__')}`
}
