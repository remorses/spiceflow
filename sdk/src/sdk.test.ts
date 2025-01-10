import { describe, expect, it } from 'vitest'
import fs from 'fs'
import { readFile } from 'fs/promises'
import path, { join } from 'path'
import { generateSDKFromOpenAPI, replaceParamsInTemplate } from './sdk'
import * as YAML from 'js-yaml'
import { OpenAPIV3 } from 'openapi-types'
import { Language, languageToExtension } from './types'

const languages: Language[] = [
  'typescript',
  'python', //
]

for (const language of languages) {
  describe(
    `generateSDKFromOpenAPI for ${language}`,
    () => {
      it.each([
        ['unkey', '../scripts/unkey-openapi.yml'],
        ['dub', '../scripts/dub-openapi.yml'],
        ['dumb', '../scripts/dumb-openapi.yml'],
      ])(
        '%s should generate SDK from OpenAPI schema',
        async (name, schemaPath) => {
          const logFolder = `logs/${language}/${name}`
          await fs.promises
            .rm(logFolder, { recursive: true, force: true })
            .catch(() => {})

          const openApiYaml = await readFile(
            join(__dirname, schemaPath),
            'utf-8',
          )
          let openApiSchema: any = YAML.load(openApiYaml)

          console.log(`generating routes code`)
          const generatedCode = await generateSDKFromOpenAPI({
            openApiSchema,
            language,
            logFolder,
          })

          await fs.promises.writeFile(
            `${logFolder}/generated-sdk.${languageToExtension[language]}`,
            generatedCode.code,
          )
          await fs.promises.writeFile(
            `${logFolder}/types.${languageToExtension[language]}`,
            generatedCode.typesCode,
          )
        },
      ) // Use longest timeout

      it('should generate SDK from OpenAPI schema, starting from existing, remove some routes', async ({
        skip,
      }) => {
        const logFolder = `logs/${language}/dumb-updated`
        await fs.promises
          .rm(logFolder, { recursive: true, force: true })
          .catch(() => {})

        // Read and parse OpenAPI schema from YAML file
        const openApiYaml = await readFile(
          join(__dirname, '../scripts/dumb-openapi.yml'),
          'utf-8',
        )
        const openApiSchema: OpenAPIV3.Document = YAML.load(openApiYaml) as any
        const previousOpenApiSchema = structuredClone(openApiSchema)
        // Remove a random route from the middle of the paths
        const pathKeys = Object.keys(openApiSchema.paths)
        const middleIndex = Math.floor(pathKeys.length / 2)
        const routeToRemove1 = pathKeys[middleIndex]
        const routeToRemove2 = pathKeys[middleIndex + 1]
        delete openApiSchema.paths[routeToRemove1]
        delete openApiSchema.paths[routeToRemove2]

        let previousSdkCode = await fs.promises
          .readFile(
            path.resolve(
              `logs/${language}/dumb/generated-sdk.${languageToExtension[language]}`,
            ),
            'utf-8',
          )
          .catch(() => {
            console.log(
              `Skipping ${language} test with previous sdk because previous sdk file not found`,
            )
            skip()
            return ''
          })

        console.log(`generating routes code`)
        const generatedCode = await generateSDKFromOpenAPI({
          language,
          openApiSchema,
          previousOpenApiSchema,
          previousSdkCode,
          logFolder,
        })

        // Write generated code to file
        await fs.promises.writeFile(
          `${logFolder}/updated-sdk.${languageToExtension[language]}`,
          generatedCode.code,
        )

        // Verify removed routes are not present in generated code
        const generatedSdk = generatedCode.code
        expect(generatedSdk).not.toContain(routeToRemove1)
        expect(generatedSdk).not.toContain(routeToRemove2)
      })
    },
    60 * 20 * 1000,
  )
}
