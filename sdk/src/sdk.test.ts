import { describe, expect, it } from 'vitest'
import fs from 'fs'
import { readFile } from 'fs/promises'
import path, { join } from 'path'
import { generateSDKFromOpenAPI, replaceParamsInTemplate } from './sdk'
import * as YAML from 'js-yaml'
import { OpenAPIV3 } from 'openapi-types'
import { Language } from './types'

const languages: Language[] = ['python', 'typescript']

for (const language of languages) {
  describe(
    `generateSDKFromOpenAPI for ${language}`,
    () => {
      it(
        'unkey should generate SDK from OpenAPI schema',
        async () => {
          const logFolder = `logs/${language}/unkey`
          await fs.promises
            .rm(logFolder, { recursive: true, force: true })
            .catch(() => {})

          const openApiSchema = (await import(
            '../scripts/unkey-openapi.json'
          ).then((x) => x.default)) as any

          console.log(`generating routes code`)
          const generatedCode = await generateSDKFromOpenAPI({
            openApiSchema,
            language,
            logFolder,
          })

          // Create scripts directory if it doesn't exist
          await fs.promises
            .mkdir('scripts', { recursive: true })
            .catch(() => {})
          await fs.promises.writeFile(
            `${logFolder}/generated-sdk.ts`,
            generatedCode.code,
          )
        },
        1000 * 100,
      )
      it('should generate SDK from dumb OpenAPI schema', async () => {
        const logFolder = `logs/${language}/dumb`
        await fs.promises
          .rm(logFolder, { recursive: true, force: true })
          .catch(() => {})

        const openApiYaml = await readFile(
          join(__dirname, '../scripts/dumb-openapi.yml'),
          'utf-8',
        )
        const openApiSchema: any = YAML.load(openApiYaml)

        console.log(`generating routes code`)
        const generatedCode = await generateSDKFromOpenAPI({
          openApiSchema,
          language,
          logFolder,
        })

        // Create scripts directory if it doesn't exist
        await fs.promises.mkdir('scripts', { recursive: true }).catch(() => {})
        await fs.promises.writeFile(
          `${logFolder}/generated-sdk.ts`,
          generatedCode.code,
        )
      })
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
            path.resolve(`logs/${language}/dumb/generated-sdk.ts`),
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

        // Create scripts directory if it doesn't exist
        await fs.promises.mkdir('scripts', { recursive: true }).catch(() => {})

        // Write generated code to file
        await fs.promises.writeFile(
          `${logFolder}/updated-sdk.ts`,
          generatedCode.code,
        )

        // Verify removed routes are not present in generated code
        const generatedSdk = generatedCode.code
        expect(generatedSdk).not.toContain(routeToRemove1)
        expect(generatedSdk).not.toContain(routeToRemove2)
      })
    },
    1000 * 100,
  )
}
