import {
  quicktype,
  InputData,
  JSONSchemaInput,
  TypeScriptTargetLanguage,
  PythonTargetLanguage,
} from 'quicktype-core'
import { Language } from './types'
import { OpenAPIV3 } from 'openapi-types'

interface GenerateTypesFromSchemaOptions {
  language: Language
  openApiSchema: OpenAPIV3.Document
}

export async function generateTypesFromSchema({
  language,
  openApiSchema,
}: GenerateTypesFromSchemaOptions): Promise<string> {
  const schemas = openApiSchema.components?.schemas || {}

  // Set up quicktype input data
  const inputData = new InputData()
  const schemaInput = new JSONSchemaInput(undefined)

  // Add each schema as a named type
  for (const [name, schema] of Object.entries(schemas)) {
    await schemaInput.addSource({
      name,
      //   uris: [`#/components/schemas/${name}`],
      schema: JSON.stringify({ ...schema, components: { schemas } }),
    })
  }

  inputData.addInput(schemaInput)

  let targetLanguage
  if (language === 'typescript') {
    targetLanguage = new TypeScriptTargetLanguage()
  } else if (language === 'python') {
    targetLanguage = new PythonTargetLanguage('Python', ['python', 'py'], 'py')
  } else {
    throw new Error(`Unsupported language: ${language}`)
  }

  // Generate the types
  const { lines } = await quicktype({
    inputData,
    lang: targetLanguage,
    leadingComments: [],

    rendererOptions: {
      'just-types': true,
      'nice-property-names': 'true',
      'prefer-unions': 'true',
      'classes-only': 'true',
    },
    indentation: '  ',
  })

  return lines.join('\n')
}
