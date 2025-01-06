import { describe, expect, it } from 'vitest'
import fs from 'fs'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { generateSDKFromOpenAPI, replaceParamsInTemplate } from './sdk'
import * as YAML from 'js-yaml'
import { OpenAPIV3 } from 'openapi-types'

it(
  'unkey should generate SDK from OpenAPI schema',
  async () => {
    // Read and parse OpenAPI schema from YAML file

    const openApiSchema = (await import('../scripts/unkey-openapi.json').then(
      (x) => x.default,
    )) as any

    let previousSdkCode = replaceParamsInTemplate({
      template: fs.readFileSync('src/boilerplate.ts', 'utf-8'),
      params: {
        ClientName: 'ExampleClient',
        ErrorName: 'ExampleError',
        UrlDefault: 'http://localhost:3000',
      },
    })

    console.log(`generating routes code`)
    const generatedCode = await generateSDKFromOpenAPI({
      openApiSchema,
      previousSdkCode,
    })

    console.log('generatedCode:\n', generatedCode)
    // Create scripts directory if it doesn't exist
    await fs.promises.mkdir('scripts', { recursive: true }).catch((error) => {})
    await fs.promises.writeFile(
      'scripts/generated-unkey-sdk.ts',
      generatedCode.code,
    )
  },
  1000 * 100,
)

describe(
  'generateSDKFromOpenAPI',
  () => {
    it('should generate SDK from OpenAPI schema', async () => {
      // Read and parse OpenAPI schema from YAML file
      const openApiYaml = await readFile(
        join(__dirname, '../../spiceflow/scripts/openapi.yml'),
        'utf-8',
      )
      const openApiSchema: any = YAML.load(openApiYaml)

      let previousSdkCode = replaceParamsInTemplate({
        template: fs.readFileSync('src/boilerplate.ts', 'utf-8'),
        params: {
          ClientName: 'ExampleClient',
          ErrorName: 'ExampleError',
          UrlDefault: 'http://localhost:3000',
        },
      })

      console.log(`generating routes code`)
      const generatedCode = await generateSDKFromOpenAPI({
        openApiSchema,
        previousSdkCode,
      })

      console.log('generatedCode:\n', generatedCode)
      // Create scripts directory if it doesn't exist
      await fs.promises
        .mkdir('scripts', { recursive: true })
        .catch((error) => {})
      await fs.promises.writeFile(
        'scripts/generated-sdk.ts',
        generatedCode.code,
      )
    })
    it('should generate SDK from OpenAPI schema, starting from existing, remove route', async () => {
      // Read and parse OpenAPI schema from YAML file
      const openApiYaml = await readFile(
        join(__dirname, '../../spiceflow/scripts/openapi.yml'),
        'utf-8',
      )
      const openApiSchema: OpenAPIV3.Document = YAML.load(openApiYaml) as any
      // Remove a random route from the middle of the paths
      const pathKeys = Object.keys(openApiSchema.paths)
      const middleIndex = Math.floor(pathKeys.length / 2)
      const routeToRemove = pathKeys[middleIndex]
      delete openApiSchema.paths[routeToRemove]

      let previousSdkCode = fs.readFileSync('scripts/generated-sdk.ts', 'utf-8')

      console.log(`generating routes code`)
      const generatedCode = await generateSDKFromOpenAPI({
        openApiSchema,
        previousSdkCode,
      })

      console.log('generatedCode:\n', generatedCode)
      // Create scripts directory if it doesn't exist
      await fs.promises
        .mkdir('scripts', { recursive: true })
        .catch((error) => {})
      await fs.promises.writeFile('scripts/updated-sdk.ts', generatedCode.code)
    })
  },
  1000 * 100,
)
