import { describe, expect, it } from 'vitest'
import fs from 'fs'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { generateSDKFromOpenAPI, replaceParamsInTemplate } from './sdk'
import * as YAML from 'js-yaml'

describe(
  'generateSDKFromOpenAPI',
  () => {
    it('should generate SDK from OpenAPI schema', async () => {
      // Read and parse OpenAPI schema from YAML file
      const openApiYaml = await readFile(
        join(__dirname, '../../spiceflow/scripts//openapi.yml'),
        'utf-8',
      )
      const openApiSchema: any = YAML.load(openApiYaml)

      const previousSdkCode = replaceParamsInTemplate({
        template: fs.readFileSync('src/boilerplate.ts', 'utf-8'),
        params: {
          ClientName: 'ExampleClient',
          ErrorName: 'ExampleError',
          UrlDefault: 'http://localhost:3000',
        },
      })
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
        generatedCode.generatedCode,
      )
      //   expect(generatedCode).toMatchInlineSnapshot(`
      //   "class SDK {
      //     private baseUrl: string;
      //     private headers: Record<string, string>;

      //     constructor(baseUrl: string, apiKey: string) {
      //       this.baseUrl = baseUrl;
      //       this.headers = {
      //         'Authorization': \`Bearer \${apiKey}\`,
      //         'Content-Type': 'application/json'
      //       };
      //     }

      //     // API methods will be generated here based on OpenAPI schema
      //     // Including request/response types, error handling, etc.
      //   }"
      // `)
    })
  },
  1000 * 100,
)
