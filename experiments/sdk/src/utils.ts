import * as fs from 'fs'
import * as path from 'path'

export async function* processConcurrentlyInOrder<T>(
  thunks: Array<() => Promise<T>>,
  maxConcurrent = 3,
): AsyncGenerator<T> {
  let queue = thunks.slice(0, maxConcurrent).map((thunk) => thunk())

  for (const [index, _] of thunks.entries()) {
    const result = await queue.shift()!

    if (index + maxConcurrent < thunks.length) {
      queue.push(thunks[index + maxConcurrent]())
    }

    yield result
  }
}

export async function recursiveReadDir(dir: string): Promise<string[]> {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      const subFiles = await recursiveReadDir(fullPath)
      files.push(...subFiles)
    } else {
      files.push(fullPath)
    }
  }

  return files
}
