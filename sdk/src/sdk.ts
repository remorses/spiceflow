import { createDeepSeek } from '@ai-sdk/deepseek'
import fs from 'fs'
import dedent from 'string-dedent'
import { streamText } from 'ai'
import type { OpenAPIV3 } from 'openapi-types'
import path from 'path'
import { createOpenAI } from '@ai-sdk/openai'

const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
})

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? '',
})

const emptyCode = dedent`
// add your sdk code here
`

export function getRoutesFromOpenAPI(openApiSchema: OpenAPIV3.Document): Array<{
  path: string
  method: string
  operationId?: string
}> {
  const routes: Array<{ path: string; method: string; operationId?: string }> =
    []

  for (const [path, pathItem] of Object.entries(openApiSchema.paths || {})) {
    for (const method of ['get', 'post', 'put', 'delete', 'patch'] as const) {
      const operation = pathItem?.[method]
      if (operation) {
        routes.push({
          path,
          method: method.toUpperCase(),
          operationId: operation.operationId,
        })
      }
    }
  }

  return routes
}

export async function generateSDKForRoute({
  route,
  openApiSchema,
  previousSdkCode = emptyCode,
}: {
  route: { path: string; method: string; operationId?: string }
  openApiSchema: OpenAPIV3.Document
  previousSdkCode?: string
}) {
  const prompt = dedent`
    Generate a TypeScript SDK method for this OpenAPI route. The SDK should:
    - Use fetch for making API calls
    - The output code should be possible to run both on Node.js and the browser, do not use Node.js specific functions and imports
    - Include all type definitions
    - Handle request/response serialization
    - Include error handling
    - Be fully typed for both inputs and outputs, use optional fields where required, use any in case no result type is provided

    OpenAPI Schema:
    <openApiSchema>
    ${JSON.stringify(openApiSchema, null, 2)}
    </openApiSchema>

    <previousSdkCode>
    ${previousSdkCode}
    </previousSdkCode>


    Only implement the new code to add for the route: ${route.method} ${
    route.path
  } 
    
    `

  const requestId = Math.random().toString(36).substring(7)
  console.time(`llm generate route ${route.method} ${route.path} ${requestId}`)

  const res = streamText({
    model: deepseek('deepseek-chat', {}),
    prompt,
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

  return snippets
}

export async function generateSDKFromOpenAPI({
  openApiSchema,
  previousSdkCode = emptyCode,
}: {
  openApiSchema: OpenAPIV3.Document
  previousSdkCode?: string
}) {
  const routes = getRoutesFromOpenAPI(openApiSchema)

  const results = await Promise.all(
    routes.map((route) =>
      generateSDKForRoute({
        route,
        openApiSchema,
        previousSdkCode,
      }),
    ),
  )

  return mergeSDKOutputs({ outputs: results, previousSdkCode, openApiSchema })
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
  const prompt = dedent`
    Merge and deduplicate the following TypeScript SDK code fragments into a single coherent SDK.
    Remove duplicate type definitions and interfaces.
    Ensure the output is well-formatted and maintains all type safety. The output file should be possible to run as is, without any additional changes.


    OpenAPI Schema:
    <openApiSchema>
    ${JSON.stringify(openApiSchema, null, 2)}
    </openApiSchema>

    Here is how the SDK code looked like before the LLM edits, this is the content the edits are based on:
    <initialSdkCode>
    ${previousSdkCode}
    </initialSdkCode>

    Input SDK fragments:
    
    ${outputs
      .map(
        (output) => dedent`
    <sdkFragmentOutput title="${output.title}">
    ${output.code}
    </sdkFragmentOutput>
    `,
      )
      .join('\n')}

    Output the complete merged TypeScript SDK code in a single large markdown snippet, before doing that reason step by step on how to best merge the output snippets.
    
    Always answer the following questions before starting to write the final snippet:
    - Are there duplicate type or function declarations? If yes, remove duplicates.
    - Are there different function declarations or types with the same name? If yes, rename them to be unique.
    - Are there duplicate class declarations that simply need to be merged by adding all the methods to the same class?
    
    The output should contain the whole file.
  `

  const requestId = Math.random().toString(36).substring(7)
  console.time(`llm merge sdk ${requestId}`)

  const res = streamText({
    model: openai('gpt-4o-mini', {}),
    prompt,
    experimental_providerMetadata: {
      // https://sdk.vercel.ai/providers/ai-sdk-providers/openai#predicted-outputs
      openai: {
        prediction: {
          type: 'content',
          content: [
            {
              type: 'text',
              text: previousSdkCode,
            },
            ...outputs.map((x) => {
              const text = x.code
              return { text, type: 'text' }
            }),
          ],
        },
      },
    },
  })

  let generatedCode = ''

  const logFile = './logs/merged-sdk.md'

  const logStream = logToFile(logFile)

  for await (const chunk of res.fullStream) {
    if (chunk.type === 'text-delta') {
      generatedCode += chunk.textDelta

      await logStream.write(chunk.textDelta)
    }
  }

  logStream.end()
  console.timeEnd(`llm merge sdk ${requestId}`)

  const outSnippets = extractMarkdownSnippets(generatedCode)
  if (outSnippets.length > 0) {
    console.error(new Error('LLM outputs more than one snippet!'))
  }
  return {
    code: outSnippets[0],
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
        buffer = ''
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
