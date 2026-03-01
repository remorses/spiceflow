import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'
import { generateRepoFiles } from './repo'
import { BoilerplateParams, languageToExtension } from './types'
import YAML from 'js-yaml'
import { readFile } from 'fs/promises'
import { generateSDKFromOpenAPI } from './sdk'

describe(
  'generateRepoFiles',
  () => {
    const mockParams: BoilerplateParams = {
      ClientName: 'TestClient',
      ErrorName: 'TestError',
      UrlDefault: 'http://localhost:3000',
      Version: '1.0.0',
      Author: 'Test Author',
      Repository: 'test/repo',
      PackageName: 'test-package',
      Description: 'Test description',
    }

    it('should generate repo files for typescript', async ({ task }) => {
      const openApiYaml = await readFile(
        path.join(__dirname, '../scripts/short-openapi.yml'),
        'utf-8',
      )
      const language = 'typescript'
      const openApiSchema: any = YAML.load(openApiYaml)
      const generatedCode = await generateSDKFromOpenAPI({
        openApiSchema,
        language,
        //   logFolder,
      })

      const outFolder = `example-sdks/${language}/dumb`

      const result = await generateRepoFiles({
        language,
        params: mockParams,
        src: [
          {
            filename: 'index.' + languageToExtension[language],
            content: generatedCode.code,
          },
        ],
        outFolder,
      })
      console.log(result)
    })
  },
  1000 * 100,
)
