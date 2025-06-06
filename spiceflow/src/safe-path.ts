import type { Spiceflow } from './spiceflow.ts'
import type { GetPathParameter, ResolvePath, Prettify } from './types.ts'

// Extract all route paths from a Spiceflow app
export type ExtractPaths<App extends Spiceflow<any, any, any, any, any, any>> =
  App extends {
    _routes: infer Routes extends Record<string, any>
  }
    ? keyof Routes extends string
      ? keyof Routes
      : never
    : never

// Create a union of all valid path patterns for an app
export type SafePaths<App extends Spiceflow<any, any, any, any, any, any>> = 
  ExtractPaths<App>

// Extract parameters for a specific path
export type SafePathParams<Path extends string> = 
  GetPathParameter<Path> extends never 
    ? {} 
    : ResolvePath<Path>

// Type-safe path builder function
export type SafePathBuilder<App extends Spiceflow<any, any, any, any, any, any>> = <
  Path extends SafePaths<App>
>(
  path: Path,
  ...args: {} extends SafePathParams<Path> 
    ? [params?: SafePathParams<Path>] 
    : [params: SafePathParams<Path>]
) => string

/**
 * Creates a type-safe path builder function for a Spiceflow app.
 * 
 * @param app - The Spiceflow app instance
 * @returns A function that builds URLs with type-safe path and parameter validation
 * 
 * @example
 * ```typescript
 * const app = new Spiceflow()
 *   .get('/users/:id', ({ params }) => params.id)
 *   .get('/posts/:postId/comments/:commentId', ({ params }) => params)
 * 
 * const safePath = createSafePath(app)
 * 
 * // Type-safe usage:
 * const userUrl = safePath('/users/:id', { id: '123' })       // '/users/123'
 * const commentUrl = safePath('/posts/:postId/comments/:commentId', { 
 *   postId: 'abc', 
 *   commentId: 'def' 
 * })  // '/posts/abc/comments/def'
 * 
 * // TypeScript errors:
 * // safePath('/users/:id', { name: 'john' })              // Error: missing 'id'
 * // safePath('/invalid', {})                              // Error: invalid path
 * ```
 */
export function createSafePath<App extends Spiceflow<any, any, any, any, any, any>>(
  app: App
): SafePathBuilder<App> {
  return function safePath<Path extends SafePaths<App>>(
    path: Path,
    ...args: {} extends SafePathParams<Path> 
      ? [params?: SafePathParams<Path>] 
      : [params: SafePathParams<Path>]
  ): string {
    const params = args[0] || {}
    
    // Replace path parameters with actual values
    let result = path as string
    
    // Find all parameter patterns in the path
    const paramPattern = /:([^\/\?]+)/g
    let match
    
    while ((match = paramPattern.exec(path as string)) !== null) {
      const paramName = match[1]
      const isOptional = paramName.endsWith('?')
      const cleanParamName = isOptional ? paramName.slice(0, -1) : paramName
      
      if (cleanParamName in params) {
        const value = (params as any)[cleanParamName]
        result = result.replace(match[0], String(value))
      } else if (!isOptional) {
        throw new Error(`Missing required parameter: ${cleanParamName}`)
      } else {
        // Remove optional parameter from path if not provided
        result = result.replace(match[0], '')
      }
    }
    
    return result
  } as SafePathBuilder<App>
}

// Legacy alias for backwards compatibility
export const safeUrl = createSafePath