// Tests the standalone dependency trace cleanup that runs before nf3 copies production dependencies.
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { test, expect } from 'vitest'
import { pruneMissingTraceReasons } from './trace-dependencies.js'

test('prunes missing traced files and parents before nf3 resolves real paths', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'spiceflow-trace-'))

  try {
    const existingFile = path.join(dir, 'existing.js')
    const existingParent = path.join(dir, 'parent.js')
    const missingFile = path.join(dir, 'missing-optional-native.js')
    const missingParent = path.join(dir, 'missing-parent.js')
    await writeFile(existingFile, 'export {}')
    await writeFile(existingParent, 'export {}')

    const result = {
      reasons: new Map([
        [
          existingFile,
          {
            parents: new Set([existingParent, missingParent]),
          },
        ],
        [
          missingFile,
          {
            parents: new Set([existingParent]),
          },
        ],
      ]),
    }

    await pruneMissingTraceReasons(result)

    expect(
      [...result.reasons].map(([file, reason]) => ({
        file: path.basename(file),
        parents: [...reason.parents].map((parent) => path.basename(parent)),
      })),
    ).toMatchInlineSnapshot(`
      [
        {
          "file": "existing.js",
          "parents": [
            "parent.js",
          ],
        },
      ]
    `)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
