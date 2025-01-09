import { describe, it, expect } from 'vitest'
import { deduplicateSchemas } from './openapi'
import fs from 'fs'
import yaml from 'js-yaml'
import path from 'path'

describe('deduplicateSchemas', () => {
  it('should deduplicate schemas in OpenAPI document', () => {
    // Read the OpenAPI file
    const openapiPath = path.join(__dirname, '../scripts/dub-openapi.yml')
    const openapiContent = fs.readFileSync(openapiPath, 'utf8')
    const openapi = yaml.load(openapiContent) as any

    // Run deduplication
    const dedupedOpenapi = deduplicateSchemas(openapi)

    // Write back the deduplicated version
    const dedupedPath = openapiPath.replace('.yml', '-deduped.yml')
    fs.writeFileSync(dedupedPath, yaml.dump(dedupedOpenapi))

    // Basic validation that the structure is maintained
    expect(dedupedOpenapi.paths).toBeDefined()
    expect(dedupedOpenapi.components).toBeDefined()
  })
})
