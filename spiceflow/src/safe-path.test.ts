import { describe, expect, it, test } from 'vitest'
import { z } from 'zod'
import { Spiceflow } from './spiceflow.ts'
import { createSafePath, safeUrl } from './safe-path.ts'

describe('createSafePath', () => {
  describe('basic functionality', () => {
    it('should work with simple paths without parameters', () => {
      const app = new Spiceflow()
        .get('/', () => 'home')
        .get('/about', () => 'about')
        .post('/contact', () => 'contact')
      
      const safePath = createSafePath(app)
      
      expect(safePath('/')).toBe('/')
      expect(safePath('/about')).toBe('/about')
      expect(safePath('/contact')).toBe('/contact')
    })

    it('should work with single path parameter', () => {
      const app = new Spiceflow()
        .get('/users/:id', ({ params }) => params.id)
        .post('/posts/:postId', ({ params }) => params.postId)
      
      const safePath = createSafePath(app)
      
      expect(safePath('/users/:id', { id: '123' })).toBe('/users/123')
      expect(safePath('/posts/:postId', { postId: 'abc-def' })).toBe('/posts/abc-def')
    })

    it('should work with multiple path parameters', () => {
      const app = new Spiceflow()
        .get('/users/:userId/posts/:postId', ({ params }) => params)
        .get('/api/:version/users/:id/settings', ({ params }) => params)
      
      const safePath = createSafePath(app)
      
      expect(safePath('/users/:userId/posts/:postId', { 
        userId: '123', 
        postId: 'abc' 
      })).toBe('/users/123/posts/abc')
      
      expect(safePath('/api/:version/users/:id/settings', { 
        version: 'v1', 
        id: '456' 
      })).toBe('/api/v1/users/456/settings')
    })

    it('should work with optional parameters', () => {
      const app = new Spiceflow()
        .get('/users/:id?', ({ params }) => params.id || 'unknown')
        .get('/search/:query?/results', ({ params }) => params)
      
      const safePath = createSafePath(app)
      
      // With optional parameter provided
      expect(safePath('/users/:id?', { id: '123' })).toBe('/users/123')
      
      // With optional parameter omitted
      expect(safePath('/users/:id?')).toBe('/users/')
      expect(safePath('/search/:query?/results')).toBe('/search//results')
      
      // With optional parameter provided
      expect(safePath('/search/:query?/results', { query: 'test' })).toBe('/search/test/results')
    })
  })

  describe('nested routes and base paths', () => {
    it('should work with nested routes', () => {
      const app = new Spiceflow()
        .get('/api/v1/users', () => 'users')
        .get('/api/v1/users/:id', ({ params }) => params.id)
        .use(
          new Spiceflow({ basePath: '/admin' })
            .get('/dashboard', () => 'dashboard')
            .get('/users/:id', ({ params }) => params.id)
        )
      
      const safePath = createSafePath(app)
      
      expect(safePath('/api/v1/users')).toBe('/api/v1/users')
      expect(safePath('/api/v1/users/:id', { id: '123' })).toBe('/api/v1/users/123')
      expect(safePath('/admin/dashboard')).toBe('/admin/dashboard')
      expect(safePath('/admin/users/:id', { id: '456' })).toBe('/admin/users/456')
    })
  })

  describe('parameter validation', () => {
    it('should handle string parameters', () => {
      const app = new Spiceflow()
        .get('/users/:id', ({ params }) => params.id, {
          params: z.object({ id: z.string() })
        })
      
      const safePath = createSafePath(app)
      
      expect(safePath('/users/:id', { id: 'test-user' })).toBe('/users/test-user')
      expect(safePath('/users/:id', { id: '123' })).toBe('/users/123')
    })

    it('should handle numeric parameters', () => {
      const app = new Spiceflow()
        .get('/posts/:id', ({ params }) => params.id)
      
      const safePath = createSafePath(app)
      
      expect(safePath('/posts/:id', { id: 123 })).toBe('/posts/123')
      expect(safePath('/posts/:id', { id: '456' })).toBe('/posts/456')
    })

    it('should throw error for missing required parameters', () => {
      const app = new Spiceflow()
        .get('/users/:id', ({ params }) => params.id)
      
      const safePath = createSafePath(app)
      
      expect(() => {
        // @ts-expect-error - should be a TypeScript error for missing id
        safePath('/users/:id', {})
      }).toThrow('Missing required parameter: id')
      
      expect(() => {
        // @ts-expect-error - should be a TypeScript error for missing parameters
        safePath('/users/:id')
      }).toThrow('Missing required parameter: id')
    })
  })

  describe('complex path patterns', () => {
    it('should work with paths containing special characters', () => {
      const app = new Spiceflow()
        .get('/files/:filename', ({ params }) => params.filename)
        .get('/users/:email/verify', ({ params }) => params.email)
      
      const safePath = createSafePath(app)
      
      expect(safePath('/files/:filename', { filename: 'document.pdf' })).toBe('/files/document.pdf')
      expect(safePath('/users/:email/verify', { email: 'user@example.com' })).toBe('/users/user@example.com/verify')
    })

    it('should work with mixed required and optional parameters', () => {
      const app = new Spiceflow()
        .get('/users/:id/posts/:postId?', ({ params }) => params)
        .get('/search/:category/:query?/page/:page', ({ params }) => params)
      
      const safePath = createSafePath(app)
      
      // Required id, optional postId provided
      expect(safePath('/users/:id/posts/:postId?', { 
        id: '123', 
        postId: 'abc' 
      })).toBe('/users/123/posts/abc')
      
      // Required id, optional postId omitted
      expect(safePath('/users/:id/posts/:postId?', { id: '123' })).toBe('/users/123/posts/')
      
      // Mixed scenario
      expect(safePath('/search/:category/:query?/page/:page', { 
        category: 'tech', 
        page: '1' 
      })).toBe('/search/tech//page/1')
    })
  })

  describe('edge cases', () => {
    it('should handle empty app', () => {
      const app = new Spiceflow()
      const safePath = createSafePath(app)
      
      // Should work but no valid paths available
      // @ts-expect-error - should be TypeScript error for invalid path
      expect(() => safePath('/invalid')).toThrow()
    })

    it('should handle app with only root route', () => {
      const app = new Spiceflow().get('/', () => 'home')
      const safePath = createSafePath(app)
      
      expect(safePath('/')).toBe('/')
    })
  })
})

describe('safeUrl alias', () => {
  it('should work as alias for createSafePath', () => {
    const app = new Spiceflow()
      .get('/users/:id', ({ params }) => params.id)
    
    const safePath1 = createSafePath(app)
    const safePath2 = safeUrl(app)
    
    expect(safePath1('/users/:id', { id: '123' })).toBe('/users/123')
    expect(safePath2('/users/:id', { id: '123' })).toBe('/users/123')
    
    // Both should produce the same result
    expect(safePath1('/users/:id', { id: 'test' })).toBe(safePath2('/users/:id', { id: 'test' }))
  })
})

describe('type safety', () => {
  it('should provide type safety at compile time', () => {
    const app = new Spiceflow()
      .get('/users/:id', ({ params }) => params.id)
      .post('/users/:userId/posts/:postId', ({ params }) => params)
      .get('/static', () => 'static')
    
    const safePath = createSafePath(app)
    
    // These should compile without errors
    safePath('/static')
    safePath('/users/:id', { id: '123' })
    safePath('/users/:userId/posts/:postId', { userId: '1', postId: '2' })
    
    // These should be TypeScript errors (but we can't test TS errors in runtime tests)
    // safePath('/invalid')  // Invalid path
    // safePath('/users/:id', { name: 'john' })  // Wrong parameter
    // safePath('/users/:id')  // Missing required parameter
  })
})

test('integration test with real spiceflow app', () => {
  const app = new Spiceflow()
    .get('/', () => 'Home page')
    .get('/about', () => 'About page')
    .get('/users', () => ['user1', 'user2'])
    .get('/users/:id', ({ params }) => `User: ${params.id}`)
    .post('/users/:id', ({ params }) => `Updated user: ${params.id}`)
    .get('/users/:id/posts', ({ params }) => `Posts for user: ${params.id}`)
    .get('/users/:userId/posts/:postId', ({ params }) => 
      `Post ${params.postId} by user ${params.userId}`)
    .get('/search/:query?', ({ params }) => `Search: ${params.query || 'all'}`)
  
  const safePath = createSafePath(app)
  
  // Test all route types
  expect(safePath('/')).toBe('/')
  expect(safePath('/about')).toBe('/about')
  expect(safePath('/users')).toBe('/users')
  expect(safePath('/users/:id', { id: 'john' })).toBe('/users/john')
  expect(safePath('/users/:id/posts', { id: '123' })).toBe('/users/123/posts')
  expect(safePath('/users/:userId/posts/:postId', { 
    userId: 'alice', 
    postId: 'my-post' 
  })).toBe('/users/alice/posts/my-post')
  expect(safePath('/search/:query?')).toBe('/search/')
  expect(safePath('/search/:query?', { query: 'typescript' })).toBe('/search/typescript')
})