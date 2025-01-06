import compareOpenApiSchemas from 'openapi-schema-diff/lib'
import dedent from 'string-dedent'
import { OpenAPIV3 } from 'openapi-types'
import { diffJson } from 'diff'

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
            change.sourceSchema || {},
            change.targetSchema || {},
          )
          const diffText = diff
            .map((part) => {
              const prefix = part.added ? '+' : part.removed ? '-' : ' '
              return part.value
                .split('\n')
                .map((line) => (line.trim() ? prefix + ' ' + line : line))
                .join('\n')
            })
            .join('')

          return dedent`
          <route type="changed" method="${route.method.toUpperCase()}" path="${
            route.path
          }">
            <comment>${change.type} ${change.action}: ${
            change.comment
          }</comment>
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
    .map(
      (route) => dedent`
        <route type="added" method="${route.method.toUpperCase()}" path="${
        route.path
      }">
        <comment>Added new route</comment>
        <diff>
        ${fullSchemaDefinition({
          path: route.path,
          method: route.method,
          schema: route.targetSchema || null,
        })
          .split('\n')
          .map((line) => '+ ' + line)
          .join('\n')}
        </diff>
        </route>
        `,
    )
    .join('\n')

  const deletedRoutesText = deletedRoutes
    .map(
      (route) => dedent`
        <route type="deleted" method="${route.method.toUpperCase()}" path="${
        route.path
      }">
        <comment>Deleted route</comment>
        <diff>
        ${fullSchemaDefinition({
          path: route.path,
          method: route.method,
          schema: route.sourceSchema || null,
        })
          .split('\n')
          .map((line) => '- ' + line)
          .join('\n')}
        </diff>
        </route>
        `,
    )
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

  return llmPrompt
}

function fullSchemaDefinition({ path, method, schema }) {
  const json = JSON.stringify(
    {
      [path]: {
        [method]: schema,
      },
    },
    null,
    2,
  )
  return json
    .split('\n')
    // .filter((line) => line.length > 0)
    .slice(1, -1) // Remove first and last lines (curly braces)
    .map((line) => line.slice(2)) // Remove 2 spaces of indentation
    .join('\n')
}
