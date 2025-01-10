import { describe, it, expect } from 'vitest'
import { generateTypesFromSchema } from './quicktype'
import fs from 'fs'
import yaml from 'js-yaml'
import path from 'path'
import { Language, languageToExtension } from './types'
import { recursivelyResolveComponents } from './diff'

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

      await expect(result.typesCode).toMatchFileSnapshot(
        `../scripts/openapi-tests/types.${languageToExtension[language]}`,
      )
    })
  })
  languages.forEach((language) => {
    it(`should generate partial ${language} types from OpenAPI route`, async () => {
      const openapiPath = path.join(__dirname, '../scripts/dub-openapi.yml')
      const openapiContent = fs.readFileSync(openapiPath, 'utf8')
      const openApiSchema = yaml.load(openapiContent) as any

      // Get first route path and method
      const firstPath = Object.keys(openApiSchema.paths)[0]
      const firstMethod = Object.keys(openApiSchema.paths[firstPath])[0]

      // Get partial schema for just this route
      const partialSchema = recursivelyResolveComponents({
        openApiSchema,
        path: firstPath,
        method: firstMethod,
      })
      await expect(yaml.dump(partialSchema)).toMatchFileSnapshot(
        `../scripts/openapi-tests/partial-schema.yml`,
      )

      const result = await generateTypesFromSchema({
        language,
        openApiSchema: partialSchema,
      })

      await expect(result.typesCode).toMatchFileSnapshot(
        `../scripts/openapi-tests/partial-types.${languageToExtension[language]}`,
      )
    })
  })
})
