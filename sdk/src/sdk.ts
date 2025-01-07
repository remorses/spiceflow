import { createDeepSeek } from '@ai-sdk/deepseek'
import safeStringify from 'fast-safe-stringify'
import compareOpenApiSchemas from 'openapi-schema-diff/lib'
import { diffJson } from 'diff'
import fs from 'fs'
import dedent from 'string-dedent'
import { streamText } from 'ai'
import type { OpenAPIV3 } from 'openapi-types'
import path from 'path'
import { createOpenAI } from '@ai-sdk/openai'
import { getOpenApiDiffPrompt } from './diff'

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
}: {
  route: RouteForLLM
  openApiSchema: OpenAPIV3.Document
  previousSdkCode?: string
}) {
  console.log(`generating sdk for route: ${route.method} ${route.path}`)
  const prompt = dedent`
    Generate a TypeScript SDK method for this OpenAPI route as a class method. The SDK should:
    - Use fetch for making API calls
    - The output code should be possible to run both on Node.js and the browser, do not use Node.js specific functions and imports
    - Include all type definitions
    - Handle request/response serialization
    - Include error handling
    - Be fully typed for both inputs and outputs, use optional fields where required, use any in case no result type is provided
    - Add a comment above the function with the route path, method and tags

    OpenAPI Schema:
    <openApiSchema>
    ${JSON.stringify(openApiSchema, null, 2)}
    </openApiSchema>

    <previousSdkCode>
    ${previousSdkCode}
    </previousSdkCode>

    ${route.diffPrompt}

    Only implement the new code to add for the route: ${route.method} ${
    route.path
  } 

    Do not add any explanations at the end of the file, instead
    
    `

  const requestId = Math.random().toString(36).substring(7)
  console.time(`llm generate route ${route.method} ${route.path} ${requestId}`)

  const res = streamText({
    model: deepseek('deepseek-chat', {}),
    prompt,
    temperature: 0,
  })

  let generatedCode = ''

  const logFile = `./logs/${
    route.operationId ||
    `${route.method.toLowerCase()}-${
      route.path.replace(/\//g, '-').replace(/^-|-$/g, '') || 'index'
    }`
  }.md`
  const logStream = logToFile(logFile)

  for await (const chunk of res.fullStream) {
    if (chunk.type === 'text-delta') {
      generatedCode += chunk.textDelta

      await logStream.write(chunk.textDelta)
    }
  }

  logStream.end()
  console.timeEnd(
    `llm generate route ${route.method} ${route.path} ${requestId}`,
  )

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
}: {
  openApiSchema: OpenAPIV3.Document
  previousOpenApiSchema?: OpenAPIV3.Document
  previousSdkCode?: string
}) {
  const routes = getRoutesFromOpenAPI({ openApiSchema, previousOpenApiSchema })

  const results = await Promise.all(
    routes.map((route) =>
      generateSDKForRoute({
        route,
        openApiSchema,
        previousSdkCode,
      }),
    ),
  )

  return await mergeSDKOutputs({
    outputs: results,
    previousSdkCode,
    openApiSchema,
  })
}
export async function mergeSDKOutputs({
  outputs,
  previousSdkCode,
  openApiSchema,
}: {
  previousSdkCode
  outputs: { title: string; code: string }[]
  openApiSchema: OpenAPIV3.Document
}) {
  let accumulatedCode = previousSdkCode

  for (const [index, output] of outputs.entries()) {
    const prompt = dedent`
      Add the route implementation to the class instance, for ${output.title}

      
    `
    const requestId = Math.random().toString(36).substring(7)
    console.time(`cursor merge sdk ${index} ${requestId}`)
    console.log(
      `Processing route ${index + 1}/${outputs.length}: ${output.title}`,
    )

    const resultMessage = dedent`
    

    ${output.code}
    `

    const result = await makeCursorSlashEditRequest({
      prompt,
      fileContents: accumulatedCode,
      filename: 'sdk.ts',
      accessToken: process.env.CURSOR_ACCESS_TOKEN,
      refreshToken: process.env.CURSOR_REFRESH_TOKEN,
      useFastApply: true,
      resultMessage,
      snippetContents: extractMarkdownSnippets(output.code).join('\n\n'),
      useChunkSpeculationForLongFiles: true,
    })

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

  // Check if all matches have corresponding params
  const missingParams = matches.filter((match) => {
    const paramName = match.replace(replacePrefix, '')
    return !params[paramName]
  })

  if (missingParams.length > 0) {
    throw new Error(
      `Missing parameters: ${missingParams
        .map((m) => m.replace(replacePrefix, ''))
        .join(', ')}`,
    )
  }

  // Replace all matches with their params
  let result = template
  matches.forEach((match) => {
    const paramName = match.replace(replacePrefix, '')
    result = result.replaceAll(match, params[paramName])
  })

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
