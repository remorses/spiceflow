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
    - Include all type definitions
    - Handle request/response serialization
    - Include error handling
    - Be fully typed, for both inputs and outputs, use optional fields where required, use any in case no result type is provided

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

  const res = streamText({
    model: deepseek('deepseek-chat', {}),
    prompt,
  })

  let generatedCode = ''

  const logFile = `./logs/${
    route.operationId ||
    `${route.method.toLowerCase()}-${route.path
      .replace(/\//g, '-')
      .replace(/^-|-$/g, '')}`
  }.md`
  const logStream = logToFile(logFile)

  for await (const chunk of res.fullStream) {
    if (chunk.type === 'text-delta') {
      generatedCode += chunk.textDelta

      logStream.write(chunk.textDelta)
    }
  }

  logStream.end()

  return {
    code: generatedCode,
    title: `SDK Code for Route: ${route.method} ${route.path}`,
  }
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

  return mergeSDKOutputs({ outputs: results, previousSdkCode })
}

export async function mergeSDKOutputs({
  outputs,
  previousSdkCode,
}: {
  previousSdkCode
  outputs: { title: string; code: string }[]
}) {
  const prompt = dedent`
    Merge and deduplicate the following TypeScript SDK code fragments into a single coherent SDK.
    Remove duplicate type definitions and interfaces.
    Organize related methods into namespaces based on their functionality.
    Ensure the output is well-formatted and maintains all type safety.


    Here is how the SDK code looked like before the LLM edits, this is the content the edits are based on:
    <initialSdkCode>
    ${previousSdkCode}
    </initialSdkCode>

    Input SDK fragments:
    
    ${outputs
      .map(
        (output) => dedent`
    <sdkFragmentCode title="${output.title}">
    ${output.code}
    </sdkFragmentCode>
    `,
      )
      .join('\n')}

    Output only the complete merged TypeScript SDK code fully, it should contain the whole file. Do not include any other text or explanations.
  `

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

      logStream.write(chunk.textDelta)
    }
  }

  logStream.end()

  return {
    code: generatedCode
      .split('\n')
      .filter((x) => !x.startsWith('```'))
      .join('\n'),
  }
}

export function logToFile(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, '')
  const logStream = fs.createWriteStream(filePath, {})
  return logStream
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
