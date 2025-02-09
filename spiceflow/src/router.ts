import { InternalRoute } from './types.js'

interface Node {
  pathPart: string
  store: Record<string, InternalRoute> | null
  staticChildren: Map<number, Node> | null
  parametricChild: ParametricNode | null
  wildcardStore: any | null
}

interface ParametricNode {
  paramName: string
  store: Record<string, InternalRoute> | null
  staticChild: Node | null
}

interface RouteMatch {
  store: Record<string, InternalRoute>
  params: Record<string, string>
}

function createNode(pathPart: string, staticChildren?: Node[]): Node {
  return {
    pathPart,
    store: null,
    staticChildren:
      staticChildren === undefined
        ? null
        : new Map(
            staticChildren.map((child) => [
              child.pathPart.charCodeAt(0),
              child,
            ]),
          ),
    parametricChild: null,
    wildcardStore: null,
  }
}

function cloneNode(node: Node, newPathPart: string): Node {
  return {
    pathPart: newPathPart,
    store: node.store,
    staticChildren: node.staticChildren,
    parametricChild: node.parametricChild,
    wildcardStore: node.wildcardStore,
  }
}

function createParametricNode(paramName: string): ParametricNode {
  return {
    paramName,
    store: null,
    staticChild: null,
  }
}

function defaultStoreFactory(): Record<string, any> {
  return Object.create(null)
}

export class MedleyRouter {
  private _root: Node
  private _storeFactory: () => any

  constructor({ storeFactory }: { storeFactory?: () => any } = {}) {
    if (storeFactory === undefined) {
      storeFactory = defaultStoreFactory
    } else if (typeof storeFactory === 'function') {
      const customStoreFactory = storeFactory
      storeFactory = () => {
        const store = customStoreFactory()
        if (store === null) {
          throw new Error(
            'Custom storeFactory returned `null`, which is not allowed',
          )
        }
        return store
      }
    } else {
      throw new TypeError('`storeFactory` must be a function')
    }

    this._root = createNode('/')
    this._storeFactory = storeFactory
  }

  register(path: string): any {
    if (typeof path !== 'string') {
      throw new TypeError('Route path must be a string')
    }
    if (path === '' || path[0] !== '/') {
      throw new Error(
        `Invalid route: ${path}\nRoute path must begin with a "/"`,
      )
    }

    const endsWithWildcard = path.endsWith('*')

    if (endsWithWildcard) {
      path = path.slice(0, -1) // Slice off trailing '*'
    }

    const staticParts = path.split(/:.+?(?=\/|$)/)
    const paramParts = path.match(/:.+?(?=\/|$)/g) || []

    if (staticParts[staticParts.length - 1] === '') {
      staticParts.pop()
    }

    let node = this._root
    let paramPartsIndex = 0

    for (let i = 0; i < staticParts.length; ++i) {
      let pathPart = staticParts[i]

      if (i > 0) {
        // Set parametric properties on the node
        const paramName = paramParts[paramPartsIndex++].slice(1)

        if (node.parametricChild === null) {
          node.parametricChild = createParametricNode(paramName)
        } else if (node.parametricChild.paramName !== paramName) {
          throw new Error(
            `Cannot create route "${path}" with parameter "${paramName}" ` +
              'because a route already exists with a different parameter name ' +
              `("${node.parametricChild.paramName}") in the same location`,
          )
        }

        const { parametricChild } = node

        if (parametricChild.staticChild === null) {
          node = parametricChild.staticChild = createNode(pathPart)
          continue
        }

        node = parametricChild.staticChild
      }

      for (let j = 0; ; ) {
        if (j === pathPart.length) {
          if (j < node.pathPart.length) {
            // Move the current node down
            const childNode = cloneNode(node, node.pathPart.slice(j))
            Object.assign(node, createNode(pathPart, [childNode]))
          }
          break
        }

        if (j === node.pathPart.length) {
          // Add static child
          if (node.staticChildren === null) {
            node.staticChildren = new Map()
          } else if (node.staticChildren.has(pathPart.charCodeAt(j))) {
            // Re-run loop with existing static node
            node = node.staticChildren.get(pathPart.charCodeAt(j))!
            pathPart = pathPart.slice(j)
            j = 0
            continue
          }

          // Create new node
          const childNode = createNode(pathPart.slice(j))
          node.staticChildren.set(pathPart.charCodeAt(j), childNode)
          node = childNode

          break
        }

        if (pathPart[j] !== node.pathPart[j]) {
          // Split the node
          const existingChild = cloneNode(node, node.pathPart.slice(j))
          const newChild = createNode(pathPart.slice(j))

          Object.assign(
            node,
            createNode(node.pathPart.slice(0, j), [existingChild, newChild]),
          )

          node = newChild

          break
        }

        ++j
      }
    }

    if (paramPartsIndex < paramParts.length) {
      // The final part is a parameter
      const param = paramParts[paramPartsIndex]
      const paramName = param.slice(1)

      if (node.parametricChild === null) {
        node.parametricChild = createParametricNode(paramName)
      } else if (node.parametricChild.paramName !== paramName) {
        throw new Error(
          `Cannot create route "${path}" with parameter "${paramName}" ` +
            'because a route already exists with a different parameter name ' +
            `("${node.parametricChild.paramName}") in the same location`,
        )
      }

      if (node.parametricChild.store === null) {
        node.parametricChild.store = this._storeFactory()
      }

      return node.parametricChild.store
    }

    if (endsWithWildcard) {
      // The final part is a wildcard
      if (node.wildcardStore === null) {
        node.wildcardStore = this._storeFactory()
      }

      return node.wildcardStore
    }

    // The final part is static
    if (node.store === null) {
      node.store = this._storeFactory()
    }

    return node.store
  }

  find(url: string): RouteMatch | null {
    if (url === '' || url[0] !== '/') {
      return null
    }

    const queryIndex = url.indexOf('?')
    const urlLength = queryIndex >= 0 ? queryIndex : url.length

    return matchRoute(url, urlLength, this._root, 0)
  }

  debugTree(): string {
    return require('object-treeify')(debugNode(this._root)).replace(
      /^.{3}/gm,
      '',
    ) // Remove the first 3 characters of every line
  }
}

function matchRoute(
  url: string,
  urlLength: number,
  node: Node,
  startIndex: number,
): RouteMatch | null {
  const { pathPart } = node
  const pathPartLen = pathPart.length
  const pathPartEndIndex = startIndex + pathPartLen

  // Only check the pathPart if its length is > 1 since the parent has
  // already checked that the url matches the first character
  if (pathPartLen > 1) {
    if (pathPartEndIndex > urlLength) {
      return null
    }

    if (pathPartLen < 15) {
      // Using a loop is faster for short strings
      for (let i = 1, j = startIndex + 1; i < pathPartLen; ++i, ++j) {
        if (pathPart[i] !== url[j]) {
          return null
        }
      }
    } else if (url.slice(startIndex, pathPartEndIndex) !== pathPart) {
      return null
    }
  }

  startIndex = pathPartEndIndex

  if (startIndex === urlLength) {
    // Reached the end of the URL
    if (node.store !== null) {
      return {
        store: node.store,
        params: {},
      }
    }

    if (node.wildcardStore !== null) {
      return {
        store: node.wildcardStore,
        params: { '*': '' },
      }
    }

    return null
  }

  if (node.staticChildren !== null) {
    const staticChild = node.staticChildren.get(url.charCodeAt(startIndex))

    if (staticChild !== undefined) {
      const route = matchRoute(url, urlLength, staticChild, startIndex)

      if (route !== null) {
        return route
      }
    }
  }

  if (node.parametricChild !== null) {
    const parametricNode = node.parametricChild
    const slashIndex = url.indexOf('/', startIndex)

    if (slashIndex !== startIndex) {
      // Params cannot be empty
      if (slashIndex === -1 || slashIndex >= urlLength) {
        if (parametricNode.store !== null) {
          const params: Record<string, string> = {} // This is much faster than using a computed property
          params[parametricNode.paramName] = url.slice(startIndex, urlLength)
          return {
            store: parametricNode.store,
            params,
          }
        }
      } else if (parametricNode.staticChild !== null) {
        const route = matchRoute(
          url,
          urlLength,
          parametricNode.staticChild,
          slashIndex,
        )

        if (route !== null) {
          route.params[parametricNode.paramName] = url.slice(
            startIndex,
            slashIndex,
          )
          return route
        }
      }
    }
  }

  if (node.wildcardStore !== null) {
    return {
      store: node.wildcardStore,
      params: {
        '*': url.slice(startIndex, urlLength),
      },
    }
  }

  return null
}

function debugNode(node: any): Record<string, any> {
  if (node.store === null && node.staticChildren === null) {
    // Can compress output better
    if (node.parametricChild === null) {
      // There is only a wildcard store
      return { [node.pathPart + '* (s)']: null }
    }

    if (node.wildcardStore === null) {
      // There is only a parametric child
      if (node.parametricChild.store === null) {
        return {
          [node.pathPart + ':' + node.parametricChild.paramName]: debugNode(
            node.parametricChild.staticChild,
          ),
        }
      }

      if (node.parametricChild.staticChild === null) {
        return {
          [node.pathPart + ':' + node.parametricChild.paramName + ' (s)']: null,
        }
      }
    }
  }

  const childRoutes: Record<string, any> = {}

  if (node.staticChildren !== null) {
    for (const childNode of node.staticChildren.values()) {
      Object.assign(childRoutes, debugNode(childNode))
    }
  }

  if (node.parametricChild !== null) {
    const { parametricChild } = node
    const label =
      ':' + parametricChild.paramName + debugStore(parametricChild.store)

    childRoutes[label] =
      parametricChild.staticChild === null
        ? null
        : debugNode(parametricChild.staticChild)
  }

  if (node.wildcardStore !== null) {
    childRoutes['* (s)'] = null
  }

  return {
    [node.pathPart + debugStore(node.store)]: childRoutes,
  }
}

function debugStore(store: any): string {
  return store === null ? '' : ' (s)'
}
