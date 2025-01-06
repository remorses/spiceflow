import compareOpenApiSchemas from 'openapi-schema-diff/lib'
import deepmerger from '@fastify/deepmerge'
const deepmerge = deepmerger({})

import { RefResolver } from 'json-schema-ref-resolver'

import dedent from 'string-dedent'
import { OpenAPIV3 } from 'openapi-types'
import { diffJson } from 'diff'
import { randomUUID } from 'crypto'

export function getOpenApiDiffPrompt({
  previousOpenApiSchema,
  openApiSchema,
}: {
  previousOpenApiSchema: OpenAPIV3.Document
  openApiSchema: OpenAPIV3.Document
}) {
  const { changedRoutes, addedRoutes, deletedRoutes } = compareOpenApiSchemas(
    previousOpenApiSchema,
    openApiSchema,
  )

  const changedRoutesText = changedRoutes
    .map((route) => {
      if (!route.changes) {
        return `<route type="changed" method="${route.method.toUpperCase()}" path="${
          route.path
        }" />`
      }

      const changesText = route.changes
        .map((change) => {
          const diff = diffJson(
            lessIndentation(
              recursivelyResolveComponents({
                subsetSchema: change.sourceSchema,
                schema: previousOpenApiSchema,
                path: route.path,
                method: route.method,
              }),
            ) || {},
            lessIndentation(
              recursivelyResolveComponents({
                subsetSchema: change.targetSchema,
                schema: openApiSchema,
                path: route.path,
                method: route.method,
              }),
            ) || {},
          )
          const diffText = diff
            .map((part) => {
              const prefix = part.added ? '+' : part.removed ? '-' : ' '
              return part.value
                .split('\n')
                // .filter(x => x)
                // .map(line => prefix + ' ' + line)
                .map((line) => (line.trim() ? prefix + ' ' + line : line))
                .join('\n')
            })
            .join('')

          return dedent`
            <route type="changed" method="${route.method.toUpperCase()}" path="${
                route.path
            }">
            <comment>${change.type} ${change.action}: ${change.comment}</comment>
            <diff>
            ${diffText}
            </diff>
            </route>
            `
        })
        .join('\n\n')

      return changesText
    })
    .join('\n\n')

  const addedRoutesText = addedRoutes
    .map((route) => {
      const schema = recursivelyResolveComponents({
        subsetSchema: route.targetSchema,
        schema: openApiSchema,
        path: route.path,
        method: route.method,
      })
      return dedent`
            <route type="added" method="${route.method.toUpperCase()}" path="${
            route.path}">
            <comment>Added new route</comment>
            <diff>
            ${lessIndentation(schema)
            .split('\n')
            .map((line) => '+ ' + line)
            .join('\n')}
            </diff>
            </route>
        `
    })
    .join('\n')

  const deletedRoutesText = deletedRoutes
    .map((route) => {
      const schema =
        recursivelyResolveComponents({
          subsetSchema: route.sourceSchema,
          schema: previousOpenApiSchema,
          path: route.path,
          method: route.method,
        }) || null

      return dedent`
        <route type="deleted" method="${route.method.toUpperCase()}" path="${
        route.path
      }">
        <comment>Deleted route</comment>
        <diff>
        ${lessIndentation(schema)
          .split('\n')
          .map((line) => '- ' + line)
          .join('\n')}
        </diff>
        </route>
        `
    })
    .join('\n')

  const llmPrompt = dedent`
    <changedRoutes>
    ${changedRoutesText || 'None'}
    </changedRoutes>

    <addedRoutes>
    ${addedRoutesText || 'None'}
    </addedRoutes>

    <deletedRoutes>
    ${deletedRoutesText || 'None'} 
    </deletedRoutes>
    `

  return { fullPrompt: llmPrompt }
}

function refPathToObject(ref: string, value: any) {
  const parts = ref.replace(/^#\//, '').split('/') // Remove leading #/ with regex
  let result = {}
  let current = result

  // Build the nested structure
  for (let i = 0; i < parts.length - 1; i++) {
    current[parts[i]] = {}
    current = current[parts[i]]
  }

  // Set the final value
  current[parts[parts.length - 1]] = value
  return result
}

function recursivelyResolveComponents({
  schema,
  path,
  method,
  root = undefined as any,
  subsetSchema,
}) {
  const resolver = new RefResolver()
  const id = randomUUID()
  resolver.addSchema(schema, id)
  let result = structuredClone(subsetSchema)

  if (!root) {
    root = {
      [path]: {
        [method]: subsetSchema,
      },
    }
  }
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === 'object' && value !== null) {
      if ('$ref' in value) {
        const resolved = resolver.getSchema(id, value.$ref as any)
        // result[key] = resolved

        // Convert ref path to nested object and merge
        const refObject = refPathToObject(value.$ref as string, resolved)
        root = deepmerge(root, refObject)
      } else {
        let newRoot = recursivelyResolveComponents({
          schema,
          subsetSchema: value,
          root,
          path,
          method,
        })
        root = newRoot
        // result[key] = nestedResult
      }
    }
  }

  return root
}

function lessIndentation(schema) {
  const json = JSON.stringify(schema, null, 2)
  return json
    .split('\n')
    .filter((line) => line.length > 0)
    .slice(1, -1) // Remove first and last lines (curly braces)
    .map((line) => line.slice(2)) // Remove 2 spaces of indentation
    .join('\n')
}
