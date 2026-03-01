import { describe, it, expect } from 'vitest'
import { deduplicateSchemas } from './openapi'
import fs from 'fs'
import yaml from 'js-yaml'
import path from 'path'

describe('deduplicateSchemas', () => {
  it('should deduplicate schemas in OpenAPI document', async () => {
    // Read the OpenAPI file
    const openapiPath = path.join(__dirname, '../scripts/dub-openapi.yml')
    const openapiContent = fs.readFileSync(openapiPath, 'utf8')
    const openapi = yaml.load(openapiContent) as any

    // Run deduplication
    const {
      openapi: dedupedOpenapi,
      schemas,
      schemasTopLevel,
    } = deduplicateSchemas(openapi)
    await expect(
      schemas.map((x) => {
        const { schemaContainer, ...rest } = x
        return rest
      }),
    ).toMatchFileSnapshot('../scripts/openapi-tests/schemas.json5')
    await expect(
      schemasTopLevel.map((x) => {
        const { schemaContainer, ...rest } = x
        return rest
      }),
    ).toMatchFileSnapshot('../scripts/openapi-tests/schemasTopLevel.json5')

    // Write back the deduplicated version
    const dedupedPath = openapiPath.replace('.yml', '-deduped.yml')
    fs.writeFileSync(dedupedPath, yaml.dump(dedupedOpenapi))

    // Basic validation that the structure is maintained
    expect(dedupedOpenapi.paths).toBeDefined()
    expect(dedupedOpenapi.components).toBeDefined()
  })
})
