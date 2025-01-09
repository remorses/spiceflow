import { describe, it, expect } from 'vitest'
import { generateTypesFromSchema } from './quicktype'
import fs from 'fs'
import yaml from 'js-yaml'
import path from 'path'

describe('generateTypesFromSchema', () => {
  it('should generate types from OpenAPI schema', async () => {
    const openapiPath = path.join(__dirname, '../scripts/dub-openapi.yml')
    const openapiContent = fs.readFileSync(openapiPath, 'utf8')
    const openApiSchema = yaml.load(openapiContent) as any

    const result = await generateTypesFromSchema({
      language: 'typescript',
      openApiSchema,
    })

    expect(result).toMatchFileSnapshot('../scripts/openapi-tests/types.ts')
  })
})
