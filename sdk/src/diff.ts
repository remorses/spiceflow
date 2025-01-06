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
        return `<route type="changed" method="${route.method.toUpperCase()}" path="${route.path}" />`
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
                .map((line) => (line.trim() ? `${prefix} ${line}` : line))
                .join('\n')
            })
            .join('')

          return dedent`
          <route type="changed" method="${route.method.toUpperCase()}" path="${route.path}">
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
    .map((route) => `<route type="added">${route.method.toUpperCase()} ${route.path}</route>`)
    .join('\n')

  const deletedRoutesText = deletedRoutes
    .map((route) => `<route type="deleted">${route.method.toUpperCase()} ${route.path}</route>`)
    .join('\n')

  const llmPrompt = dedent`
    <changedRoutes>
    ${changedRoutesText}
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
