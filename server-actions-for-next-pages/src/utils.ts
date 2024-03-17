import { PluginPass } from "@babel/core"

const enabled = !!process.env.DEBUG_ACTIONS
export const logger = {
    log(...args) {
        enabled && console.log('[actions]:', ...args)
    },
    error(...args) {
        enabled && console.log('[actions]:', ...args)
    },
}



export function getFileName(state: PluginPass) {
    const { filename, cwd } = state

    if (!filename) {
        return undefined
    }

    if (cwd && filename.startsWith(cwd)) {
        return filename.slice(cwd.length + 1)
    }

    return filename
}
export const directive = "poor man's use server"