export const checkOptionalParameter = (path: string): string[] | null => {
  /*
     If path is `/api/animals/:type?` it will return:
     [`/api/animals`, `/api/animals/:type`]
     in other cases it will return null
    */

  if (!path.match(/\:.+\?$/)) {
    return null
  }

  const segments = path.split('/')
  const results: string[] = []
  let basePath = ''

  segments.forEach((segment) => {
    if (segment !== '' && !/\:/.test(segment)) {
      basePath += '/' + segment
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === '') {
          results.push('/')
        } else {
          results.push(basePath)
        }
        const optionalSegment = segment.replace('?', '')
        basePath += '/' + optionalSegment
        results.push(basePath)
      } else {
        basePath += '/' + segment
      }
    }
  })

  return results.filter((v, i, a) => a.indexOf(v) === i)
}

/**
 * Type representing a map of parameter indices.
 */
export type ParamIndexMap = Record<string, number>
/**
 * Type representing a stash of parameters.
 */
export type ParamStash = string[]
/**
 * Type representing a map of parameters.
 */
export type Params = Record<string, string>
/**
 * Type representing the result of a route match.
 *
 * The result can be in one of two formats:
 * 1. An array of handlers with their corresponding parameter index maps, followed by a parameter stash.
 * 2. An array of handlers with their corresponding parameter maps.
 *
 * Example:
 *
 * [[handler, paramIndexMap][], paramArray]
 * ```typescript
 * [
 *   [
 *     [middlewareA, {}],                     // '*'
 *     [funcA,       {'id': 0}],              // '/user/:id/*'
 *     [funcB,       {'id': 0, 'action': 1}], // '/user/:id/:action'
 *   ],
 *   ['123', 'abc']
 * ]
 * ```
 *
 * [[handler, params][]]
 * ```typescript
 * [
 *   [
 *     [middlewareA, {}],                             // '*'
 *     [funcA,       {'id': '123'}],                  // '/user/:id/*'
 *     [funcB,       {'id': '123', 'action': 'abc'}], // '/user/:id/:action'
 *   ]
 * ]
 * ```
 */
export type Result<T> = [[T, ParamIndexMap][], ParamStash] | [[T, Params][]]
