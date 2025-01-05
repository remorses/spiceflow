import { createDeepSeek } from '@ai-sdk/deepseek'
import dedent from 'string-dedent'
import { streamText } from 'ai'
import type { OpenAPIV3 } from 'openapi-types'
import { z } from 'zod'

const model = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
})

const emptyCode = dedent`
// add your sdk code here
`

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

const editFileSchema = z.object({
  command: z.enum(['str_replace', 'insert']).describe('The commands to run.'),
  insert_line: z
    .number()
    .int()
    .optional()
    .describe(
      'Required parameter of `insert` command. The `new_str` will be inserted AFTER the line `insert_line` of `path`.',
    ),
  new_str: z
    .string()
    .optional()
    .describe(
      'Required parameter of `str_replace` command containing the new string. Required parameter of `insert` command containing the string to insert.',
    ),
  old_str: z
    .string()
    .optional()
    .describe(
      'Required parameter of `str_replace` command containing the string in `path` to replace.',
    ),
})
//   .refine((data) => {
//     if (data.command === 'str_replace' && (!data.old_str || !data.new_str))
//       return false
//     if (data.command === 'insert' && (!data.insert_line || !data.new_str))
//       return false
//     return true
//   })

type EditFileParams = z.infer<typeof editFileSchema>

export async function generateSDKFromOpenAPI({
  openApiSchema,
  previousSdkCode = emptyCode,
}: {
  openApiSchema: OpenAPIV3.Document
  previousSdkCode?: string
}) {
  const prompt = dedent`
    Generate a TypeScript SDK class from this OpenAPI schema. The SDK should:
    - Use fetch for making API calls
    - Include all type definitions
    - Group methods by tags into namespaces
    - Handle request/response serialization
    - Include error handling
    - Be fully typed

    OpenAPI Schema:
    <openApiSchema>
    ${JSON.stringify(openApiSchema, null, 2)}
    </openApiSchema>

    <previousSdkCode>
    ${previousSdkCode}
    </previousSdkCode>

    Call editFile with your additions and deletions, do not output the code as a message, instead call the editFile tool.

    Reason step by step before editing the file.
    `

  let generatedCode = previousSdkCode
  let fullOutput = ''

  const res = streamText({
    model: model('deepseek-chat', {}),
    prompt,
    toolChoice: 'required',
    experimental_toolCallStreaming: true,
    tools: {
      editFile: {
        parameters: editFileSchema,
        execute: async ({ command, old_str, new_str, insert_line }) => {
          const params = { command, old_str, new_str, insert_line }

          if (command === 'str_replace' && old_str && new_str) {
            const matches = generatedCode.split(old_str).length - 1
            if (matches === 0) {
              return {
                success: false,
                error: `String '${old_str}' not found in code`,
                suggestions: [
                  'Check if the string exists exactly as provided',
                  'String matching is case-sensitive',
                ],
              }
            }
            if (matches > 1) {
              return {
                success: false,
                error: `Multiple matches (${matches}) found for string '${old_str}'`,
                suggestions: [
                  'Make the search string more specific',
                  'Include more surrounding context in the string',
                  'Use a unique portion of the code you want to replace',
                ],
              }
            }
            generatedCode = generatedCode.replace(old_str, new_str)
            return { success: true }
          }
          if (command === 'insert' && insert_line != null && new_str) {
            const lines = generatedCode.split('\n')
            if (insert_line >= lines.length) {
              return {
                success: false,
                error: `Invalid insert line ${insert_line} - file only has ${lines.length} lines`,
                suggestions: [
                  `Choose a line number between 0 and ${lines.length - 1}`,
                ],
              }
            }
            lines.splice(insert_line + 1, 0, new_str)
            generatedCode = lines.join('\n')
            return { success: true }
          }
          return {
            success: false,
            error: 'Invalid command parameters',
            suggestions: [
              'For str_replace: provide both old_str and new_str',
              'For insert: provide both insert_line and new_str',
            ],
          }
        },
      },
    },
  })

  for await (const item of res.fullStream) {
    process.stdout.write('\x1Bc')
    if (!item) {
      continue
    }
    if (item.type === 'text-delta') {
      fullOutput += item.textDelta
    } else if (item.type === 'tool-call-delta') {
      fullOutput += item.argsTextDelta
    } else if (item.type === 'tool-call-streaming-start') {
      fullOutput += `\n---\nEditing file with params:\n`
    } else if (item.type === 'tool-result') {
      fullOutput += `\n---\n\n`
    }
    process.stdout.write(fullOutput)
  }

  return { generatedCode, fullOutput }
}
