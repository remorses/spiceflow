import {
  quicktype,
  InputData,
  JSONSchemaInput,
  TypeScriptTargetLanguage,
  PythonTargetLanguage,
  Namer,
} from 'quicktype-core'
import { Language } from './types'
import { OpenAPIV3 } from 'openapi-types'
import { camelCase, pascalCase } from 'quicktype-core/dist/support/Strings'

interface GenerateTypesFromSchemaOptions {
  language: Language
  openApiSchema: OpenAPIV3.Document
}

export async function generateTypesFromSchema({
  language,
  openApiSchema,
}: GenerateTypesFromSchemaOptions) {
  const schemas = openApiSchema.components?.schemas || {}

  // Set up quicktype input data
  const inputData = new InputData()
  const schemaInput = new JSONSchemaInput(undefined)
  // Create a single type object containing all schemas as refs
  const allTypesSchema = {
    type: 'object',
    deprecated: true,
    properties: Object.fromEntries(
      Object.entries(schemas).map(([name, _]) => [
        name,
        { $ref: `#/components/schemas/${name}` },
      ]),
    ),
    required: Object.keys(schemas),
    components: { schemas },
  }
  const exportedNames = Object.keys(schemas).map((x) => {
    return pascalCase(x)
  })

  // Add single source with all types
  await schemaInput.addSource({
    name: '__allExportedTypes',

    schema: JSON.stringify(allTypesSchema),
  })

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
  const { lines, annotations } = await quicktype({
    inputData,
    lang: targetLanguage,
    leadingComments: [],
    alphabetizeProperties: true,
    rendererOptions: {
      'just-types': true,
      'nice-property-names': 'true',
      'prefer-unions': 'true',
      'python-version': '3.7',
      'python-style': 'dataclasses',
      'classes-only': 'true',
    },
    indentation: '  ',
  })

  return { typesCode: lines.join('\n'), exportedNames }
}
