import { createDeepSeek } from '@ai-sdk/deepseek'
import YAML from 'js-yaml'

import safeStringify from 'fast-safe-stringify'
import compareOpenApiSchemas from 'openapi-schema-diff/lib'
import { diffJson } from 'diff'
import fs from 'fs'
import dedent from 'string-dedent'
import { streamText } from 'ai'
import type { OpenAPIV3 } from 'openapi-types'
import path from 'path'
import { createOpenAI } from '@ai-sdk/openai'
import { getOpenApiDiffPrompt, recursivelyResolveComponents } from './diff'
import { applyCursorPromptPrefix, languagesPrompts } from './prompts'
import { processConcurrentlyInOrder, recursiveReadDir } from './utils'
import {
  BoilerplateParams,
  Language,
  languageToExtension as extensions,
} from './types'
import { cleanupOpenApi } from './openapi'
import { generateTypesFromSchema } from './quicktype'

const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
})

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? '',
})

export function getRoutesFromOpenAPI({
  openApiSchema,
  previousOpenApiSchema,
}: {
  openApiSchema: OpenAPIV3.Document
  previousOpenApiSchema?: OpenAPIV3.Document
}): RouteForLLM[] {
  if (!openApiSchema?.paths) {
    throw new Error(
      `openapi schema does not have paths: keys instead are: ${JSON.stringify(
        Object.keys(openApiSchema),
      )}`,
    )
  }

  if (previousOpenApiSchema) {
    const {
      addedRoutesText,
      changedRoutesText,
      deletedRoutesText,
      fullPrompt,
    } = getOpenApiDiffPrompt({ openApiSchema, previousOpenApiSchema })

    // Only add routes that were added, changed or deleted
    const affectedRoutes = [
      ...addedRoutesText,
      ...changedRoutesText,
      ...deletedRoutesText,
    ]
    console.log(`Added routes (${addedRoutesText.length}):`)
    console.log(
      JSON.stringify(
        addedRoutesText.map((x) => x.route.method + ' ' + x.route.path),
        null,
        2,
      ),
    )

    console.log(`Changed routes (${changedRoutesText.length}):`)
    console.log(
      JSON.stringify(
        changedRoutesText.map((x) => x.route.method + ' ' + x.route.path),
        null,
        2,
      ),
    )

    console.log(`Deleted routes (${deletedRoutesText.length}):`)
    console.log(
      JSON.stringify(
        deletedRoutesText.map((x) => x.route.method + ' ' + x.route.path),
        null,
        2,
      ),
    )
    return affectedRoutes.map((route) => ({
      path: route.route.path,
      method: route.route.method,
      diffPrompt: route.diffPrompt,
      operationId:
        openApiSchema.paths?.[route.route.path]?.[
          route.route.method.toLowerCase()
        ]?.operationId,
    }))
  } else {
    // If no previous schema, add all routes
    return Object.entries(openApiSchema.paths || {}).flatMap(
      ([path, pathItem]) =>
        ['get', 'post', 'put', 'delete', 'patch' as const]
          .filter((method) => pathItem?.[method])
          .map((method) => ({
            path,
            method: method.toUpperCase(),
            operation: pathItem?.[method],
          }))
          .map(({ path, method, operation }) => ({
            path,
            method,
            operationId: operation?.operationId,
            diffPrompt: '',
          })),
    )
  }
}

type RouteForLLM = {
  path: string
  method: string
  operationId?: string
  diffPrompt: string
}

export async function generateSDKForRoute({
  route,
  openApiSchema,
  previousSdkCode,
  language,
  logFile = null,
}: {
  route: RouteForLLM
  openApiSchema: OpenAPIV3.Document
  previousSdkCode?: string
  language: Language
  logFile?: string | null
}) {
  console.log(`generating sdk for route: ${route.method} ${route.path}`)

  const ymlSchema = YAML.dump(openApiSchema, { indent: 2, lineWidth: -1 })

  const { method, path } = route
  const { typesCode, exportedNames } = await generateTypesFromSchema({
    openApiSchema,
    language,
  })

  let typesPrompt = dedent`
  Here is the OpenAPI component types already converted to ${language}, you can use them by importing \`./types.${extensions[language]}\`:

  THIS FILE CANNOT BE EDITED

  \`\`\`${language}:types.${extensions[language]}
  ${typesCode}
  \`\`\`
  `
  // let typesPrompt = dedent`
  // Here is the OpenAPI component types already converted to ${language}, you can use them by importing \`./types.${extensions[language]}\`:
  // \`\`\`${language}:types.${extensions[language]}
  // ${typesCode}
  // \`\`\`
  // `

  const prompt = dedent`
    ${languagesPrompts[language]}

    OpenAPI Schema:
    \`\`\`yml
    ${ymlSchema}
    \`\`\`
    
    Here is the current SDK code:
    \`\`\`${language}:client.${extensions[language]}
    ${previousSdkCode}
    \`\`\`

    ${typesPrompt}

    ${route.diffPrompt}

    Only implement the new code to add for the route: 
    ${route.method} ${route.path} 

    Use the already generated code in the \`./types.${extensions[language]}\` file to implement the new code.

    Only output one code snippet that will be used to edit the \`./client.${extensions[language]}\` file.

    Do not add any explanations at the end of the file, instead do step by step reasoning before the code snippet.
    
    `

  const requestId = Math.random().toString(36).substring(7)
  console.time(`llm generate route ${route.method} ${route.path} ${requestId}`)

  const res = streamText({
    model: deepseek('deepseek-chat', {}),
    prompt,
    system: applyCursorPromptPrefix({}),
    temperature: 0,
  })

  let generatedCode = ''

  const logStream = logFile ? logToFile(logFile) : null

  logStream?.write(ymlSchema + '\n---\n')

  for await (const chunk of res.fullStream) {
    if (chunk.type === 'text-delta') {
      generatedCode += chunk.textDelta

      await logStream?.write(chunk.textDelta)
    }
  }

  logStream?.end()
  console.timeEnd(
    `llm generate route ${route.method} ${route.path} ${requestId}`,
  )

  if (!generatedCode) {
    throw new Error(
      `generation failed for ${route.method} ${route.path}: no result content`,
    )
  }
  return {
    code: generatedCode,
    // code: extractMarkdownSnippets(generatedCode).join('\n\n'),
    title: `SDK Code for Route: ${route.method} ${route.path}`,
  }
}

export function extractMarkdownSnippets(markdown: string): string[] {
  const snippets: string[] = []
  const lines = markdown.split('\n')
  let isInCodeBlock = false
  let currentSnippet: string[] = []
  let hasCodeBlocks = false

  for (const line of lines) {
    if (line.startsWith('```')) {
      hasCodeBlocks = true
      if (isInCodeBlock) {
        // End of code block
        snippets.push(currentSnippet.join('\n'))
        currentSnippet = []
      }
      isInCodeBlock = !isInCodeBlock
      continue
    }

    if (isInCodeBlock) {
      currentSnippet.push(line)
    }
  }

  // If no code blocks were found, return the entire markdown as a single snippet
  if (!hasCodeBlocks) {
    return [markdown]
  }

  return snippets.filter((snippet) => snippet.length > 0)
}

export async function generateSDKFromOpenAPI({
  openApiSchema,
  previousSdkCode,
  previousOpenApiSchema,
  logFolder = null,
  language = 'typescript',
  params,
  maxLLMConcurrency = 20,
}: {
  openApiSchema: OpenAPIV3.Document
  previousOpenApiSchema?: OpenAPIV3.Document
  previousSdkCode?: string
  language?: Language
  logFolder?: string | null
  params?: BoilerplateParams
  maxLLMConcurrency?: number
}) {
  openApiSchema = cleanupOpenApi(openApiSchema)
  if (!previousSdkCode) {
    const boilerplatePath = path.resolve(
      __dirname,
      `./boilerplates/${language}.${extensions[language]}`,
    )
    if (!fs.existsSync(boilerplatePath)) {
      throw new Error(
        `No boilerplate found for language ${language}, please create ${boilerplatePath}`,
      )
    }
    previousSdkCode = replaceParamsInTemplate({
      template: fs.readFileSync(boilerplatePath, 'utf-8'),
      params: {
        // TODO remove example boilerplate params for prod
        ClientName: 'ExampleClient',
        ErrorName: 'ExampleError',
        UrlDefault: 'http://localhost:3000',
        ...params,
      },
    })
  }
  const routes = getRoutesFromOpenAPI({ openApiSchema, previousOpenApiSchema })

  const results = await Array.fromAsync(
    processConcurrentlyInOrder(
      routes.map((route) => () => {
        const openApiSchemaSubset = recursivelyResolveComponents({
          ...route,
          openApiSchema,
        })
        return generateSDKForRoute({
          route,
          openApiSchema: openApiSchemaSubset,
          previousSdkCode,
          language,
          logFile: logFolder
            ? `${logFolder}/${
                route.operationId ||
                `${route.method.toLowerCase()}-${
                  route.path.replace(/\//g, '-').replace(/^-|-$/g, '') ||
                  'index'
                }`
              }.md`
            : null,
        })
      }),
      maxLLMConcurrency,
    ),
  )
  return await mergeSDKOutputs({
    outputs: results,
    previousSdkCode,
    openApiSchema,
    language,
    logFile: logFolder ? `${logFolder}/merge.md` : null,
  })
}

export async function mergeSDKOutputs({
  outputs,
  previousSdkCode,
  openApiSchema,
  language,
  logFile = null,
}: {
  previousSdkCode
  outputs: { title: string; code: string }[]
  openApiSchema: OpenAPIV3.Document
  logFile?: string | null
  language: Language
}) {
  let accumulatedCode = previousSdkCode

  for (const [index, output] of outputs.entries()) {
    const prompt = dedent`
    Add the route implementation to the sdk instance, for ${output.title}, in ${language}
    `
    const requestId = Math.random().toString(36).substring(7)
    console.time(`cursor merge sdk ${index} ${requestId}`)
    console.log(
      `Processing route ${index + 1}/${outputs.length}: ${output.title}`,
    )

    const resultMessage = dedent`
    ## ${output.title}

    ${output.code}
    `
    const snippet = extractMarkdownSnippets(output.code).join('\n\n')
    const result = await makeCursorSlashEditRequest({
      prompt,
      fileContents: accumulatedCode,
      filename: 'sdk.' + extensions[language],
      accessToken: process.env.CURSOR_ACCESS_TOKEN,
      refreshToken: process.env.CURSOR_REFRESH_TOKEN,
      useFastApply: true,
      resultMessage,
      snippetContents: snippet,
      useChunkSpeculationForLongFiles: true,
      logFile,
    })

    let resultLines = result.resultFile.trim().split('\n').length
    let previousLines = accumulatedCode.trim().split('\n').length
    let snippetLines = snippet.trim().split('\n').length
    if (resultLines === previousLines) {
      extractMarkdownSnippets(output.code).join('\n\n')
      console.error(
        new Error(
          `Cursor edit failed, returned the same code as before, snippet lines are: ${snippetLines}`,
        ),
      )
    }

    accumulatedCode = result.resultFile
    if (!accumulatedCode) {
      throw new Error('Cursor edit failed')
    }
    console.timeEnd(`cursor merge sdk ${index} ${requestId}`)
  }

  return {
    code: accumulatedCode,
  }
}

// export async function mergeSDKOutputsOnce({
//   outputs,
//   previousSdkCode,
//   openApiSchema,
//   logFile = null,
// }: {
//   previousSdkCode
//   outputs: { title: string; code: string }[]
//   openApiSchema: OpenAPIV3.Document
//   logFile?: string | null
// }) {
//   let accumulatedCode = previousSdkCode

//   for (const [index, output] of outputs.entries()) {
//     const prompt = dedent`
//       Add the route implementation to the class instance, for ${output.title}

//     `
//     const requestId = Math.random().toString(36).substring(7)
//     console.time(`cursor merge sdk ${index} ${requestId}`)
//     console.log(
//       `Processing route ${index + 1}/${outputs.length}: ${output.title}`,
//     )

//     const resultMessage = dedent`

//     ${output.code}
//     `

//     const result = await makeCursorSlashEditRequest({
//       prompt,
//       fileContents: accumulatedCode,
//       filename: 'sdk.ts',
//       accessToken: process.env.CURSOR_ACCESS_TOKEN,
//       refreshToken: process.env.CURSOR_REFRESH_TOKEN,
//       useFastApply: true,
//       resultMessage,
//       snippetContents: extractMarkdownSnippets(output.code).join('\n\n'),
//       useChunkSpeculationForLongFiles: true,
//       logFile,
//     })

//     accumulatedCode = result.resultFile
//     if (!accumulatedCode) {
//       throw new Error('Cursor edit failed')
//     }
//     console.timeEnd(`cursor merge sdk ${index} ${requestId}`)
//   }

//   return {
//     code: accumulatedCode,
//   }
// }

export function logToFile(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.promises.writeFile(filePath, '')

  let buffer = ''
  let lastWrite = Date.now()

  return {
    write: async (data: string) => {
      buffer += data
      const now = Date.now()
      if (now - lastWrite >= 50) {
        await fs.promises.writeFile(filePath, buffer)
        lastWrite = now
      }
    },
    end: async () => {
      if (buffer) {
        await fs.promises.writeFile(filePath, buffer)
      }
    },
  }
}
export function replaceParamsInTemplate({
  template,
  params,
}: {
  template: string
  params: Record<string, string>
}) {
  const replacePrefix = '_replaced'

  // Find all unique strings starting with _replace in the template
  // \b matches a word boundary - ensures we only match _replace when it's a complete word, not part of another word
  const matches = [
    ...new Set(
      template.match(new RegExp(`\\b${replacePrefix}[a-zA-Z]+\\b`, 'g')) || [],
    ),
  ]

  if (!matches.length) {
    return template
  }

  // Replace all matches with their params or use common prefix
  let result = template
  const missingParams: string[] = []

  matches.forEach((match) => {
    const paramName = match.replace(replacePrefix, '')

    // Check if exact param exists
    if (params[paramName]) {
      result = result.replaceAll(match, params[paramName])
      return
    }

    // Look for common prefix params
    const commonPrefixParam = Object.entries(params).find(
      ([key]) => key && paramName.startsWith(key),
    )

    if (commonPrefixParam) {
      const [prefix, value] = commonPrefixParam
      const postfix = paramName.slice(prefix.length)
      result = result.replaceAll(match, value + postfix)
    } else {
      missingParams.push(paramName)
    }
  })

  if (missingParams.length > 0) {
    throw new Error(`Missing parameters: ${missingParams.join(', ')}`)
  }

  return result
}

interface SlashEditParams {
  fileContents?: string
  filename?: string
  prompt?: string
  resultMessage?: string
  useFastApply?: boolean
  useChunkSpeculationForLongFiles?: boolean
  accessToken?: string
  refreshToken?: string
  snippetContents?: string
  logFile?: string | null
}
export async function makeCursorSlashEditRequest(
  params: SlashEditParams,
  baseUrl?: string,
) {
  if (!baseUrl) {
    const env = process.env.CURSOR_URL
    if (env) {
      console.log(`using process.env.CURSOR_URL`)
    }
    baseUrl = env || 'https://cursor-rpc-master.fly.dev/'
  }
  console.time('makeCursorSlashEditRequest')
  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })

  if (!response.ok) {
    throw new Error(
      `HTTP error! status: ${
        response.status
      }, url: ${baseUrl}, response: ${await response.text()}`,
    )
  }

  const json = await response.json()
  console.timeEnd('makeCursorSlashEditRequest')
  return json as {
    resultFile: string
  }
}
