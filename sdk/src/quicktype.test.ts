import { describe, it, expect } from 'vitest'
import { generateTypesFromSchema } from './quicktype'
import fs from 'fs'
import yaml from 'js-yaml'
import path from 'path'
import { Language } from './types'

describe('generateTypesFromSchema', () => {
  const languages: Language[] = ['typescript', 'python']

  languages.forEach((language) => {
    it(`should generate ${language} types from OpenAPI schema`, async () => {
      const openapiPath = path.join(__dirname, '../scripts/dub-openapi.yml')
      const openapiContent = fs.readFileSync(openapiPath, 'utf8')
      const openApiSchema = yaml.load(openapiContent) as any

      const result = await generateTypesFromSchema({
        language,
        openApiSchema,
      })

      expect(result.typesCode).toMatchFileSnapshot(
        `../scripts/openapi-tests/types.${
          language === 'typescript' ? 'ts' : 'py'
        }`,
      )
    })
  })
})
