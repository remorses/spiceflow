import { describe, expect, it, test } from 'vitest'
import { z } from 'zod'
import { Spiceflow } from './spiceflow.ts'

describe('safePath method', () => {
  describe('basic functionality', () => {
    it('should work with simple paths without parameters', () => {
      const app = new Spiceflow()
        .get('/', () => 'home')
        .get('/about', () => 'about')
        .post('/contact', () => 'contact')
      
      expect(app.safePath('/')).toBe('/')
      expect(app.safePath('/about')).toBe('/about')
      expect(app.safePath('/contact')).toBe('/contact')
    })

    it('should work with single path parameter', () => {
      const app = new Spiceflow()
        .get('/users/:id', ({ params }) => params.id)
        .post('/posts/:postId', ({ params }) => params.postId)
      
      expect(app.safePath('/users/:id', { id: '123' })).toBe('/users/123')
      expect(app.safePath('/posts/:postId', { postId: 'abc-def' })).toBe('/posts/abc-def')
    })

    it('should work with multiple path parameters', () => {
      const app = new Spiceflow()
        .get('/users/:userId/posts/:postId', ({ params }) => params)
        .get('/api/:version/users/:id/settings', ({ params }) => params)
      
      expect(app.safePath('/users/:userId/posts/:postId', { 
        userId: '123', 
        postId: 'abc' 
      })).toBe('/users/123/posts/abc')
      
      expect(app.safePath('/api/:version/users/:id/settings', { 
        version: 'v1', 
        id: '456' 
      })).toBe('/api/v1/users/456/settings')
    })

    it('should work with optional parameters', () => {
      const app = new Spiceflow()
        .get('/users/:id?', ({ params }) => params.id || 'unknown')
        .get('/search/:query?/results', ({ params }) => params)
      
      // With optional parameter provided
      expect(app.safePath('/users/:id?', { id: '123' })).toBe('/users/123')
      
      // With optional parameter omitted
      expect(app.safePath('/users/:id?')).toBe('/users/')
      expect(app.safePath('/search/:query?/results')).toBe('/search//results')
      
      // With optional parameter provided
      expect(app.safePath('/search/:query?/results', { query: 'test' })).toBe('/search/test/results')
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
      
      expect(app.safePath('/api/v1/users')).toBe('/api/v1/users')
      expect(app.safePath('/api/v1/users/:id', { id: '123' })).toBe('/api/v1/users/123')
      expect(app.safePath('/admin/dashboard')).toBe('/admin/dashboard')
      expect(app.safePath('/admin/users/:id', { id: '456' })).toBe('/admin/users/456')
    })
  })

  describe('parameter validation', () => {
    it('should handle string parameters', () => {
      const app = new Spiceflow()
        .get('/users/:id', ({ params }) => params.id, {
          params: z.object({ id: z.string() })
        })
      
      expect(app.safePath('/users/:id', { id: 'test-user' })).toBe('/users/test-user')
      expect(app.safePath('/users/:id', { id: '123' })).toBe('/users/123')
    })

    it('should handle numeric parameters', () => {
      const app = new Spiceflow()
        .get('/posts/:id', ({ params }) => params.id)
      
      expect(app.safePath('/posts/:id', { id: 123 })).toBe('/posts/123')
      expect(app.safePath('/posts/:id', { id: '456' })).toBe('/posts/456')
    })

    it('should throw error for missing required parameters', () => {
      const app = new Spiceflow()
        .get('/users/:id', ({ params }) => params.id)
      
      expect(() => {
        // @ts-expect-error - should be a TypeScript error for missing id
        app.safePath('/users/:id', {})
      }).toThrow('Missing required parameter: id')
      
      expect(() => {
        // @ts-expect-error - should be a TypeScript error for missing parameters
        app.safePath('/users/:id')
      }).toThrow('Missing required parameter: id')
    })
  })

  describe('complex path patterns', () => {
    it('should work with paths containing special characters', () => {
      const app = new Spiceflow()
        .get('/files/:filename', ({ params }) => params.filename)
        .get('/users/:email/verify', ({ params }) => params.email)
      
      expect(app.safePath('/files/:filename', { filename: 'document.pdf' })).toBe('/files/document.pdf')
      expect(app.safePath('/users/:email/verify', { email: 'user@example.com' })).toBe('/users/user@example.com/verify')
    })

    it('should work with mixed required and optional parameters', () => {
      const app = new Spiceflow()
        .get('/users/:id/posts/:postId?', ({ params }) => params)
        .get('/search/:category/:query?/page/:page', ({ params }) => params)
      
      // Required id, optional postId provided
      expect(app.safePath('/users/:id/posts/:postId?', { 
        id: '123', 
        postId: 'abc' 
      })).toBe('/users/123/posts/abc')
      
      // Required id, optional postId omitted
      expect(app.safePath('/users/:id/posts/:postId?', { id: '123' })).toBe('/users/123/posts/')
      
      // Mixed scenario
      expect(app.safePath('/search/:category/:query?/page/:page', { 
        category: 'tech', 
        page: '1' 
      })).toBe('/search/tech//page/1')
    })
  })

  describe('edge cases', () => {
    it('should handle empty app', () => {
      const app = new Spiceflow()
      
      // Should work but no valid paths available
      // @ts-expect-error - should be TypeScript error for invalid path
      expect(() => app.safePath('/invalid')).toThrow()
    })

    it('should handle app with only root route', () => {
      const app = new Spiceflow().get('/', () => 'home')
      
      expect(app.safePath('/')).toBe('/')
    })
  })
})

describe('safePath method compatibility', () => {
  it('should work consistently', () => {
    const app = new Spiceflow()
      .get('/users/:id', ({ params }) => params.id)
    
    expect(app.safePath('/users/:id', { id: '123' })).toBe('/users/123')
    expect(app.safePath('/users/:id', { id: '123' })).toBe('/users/123')
    
    // Both should produce the same result
    expect(app.safePath('/users/:id', { id: 'test' })).toBe(app.safePath('/users/:id', { id: 'test' }))
  })
})

describe('type safety', () => {
  it('should provide type safety at compile time', () => {
    const app = new Spiceflow()
      .get('/users/:id', ({ params }) => params.id)
      .post('/users/:userId/posts/:postId', ({ params }) => params)
      .get('/static', () => 'static')
    
    // These should compile without errors
    app.safePath('/static')
    app.safePath('/users/:id', { id: '123' })
    app.safePath('/users/:userId/posts/:postId', { userId: '1', postId: '2' })
    
    // These should be TypeScript errors (but we can't test TS errors in runtime tests)
    // app.safePath('/invalid')  // Invalid path
    // app.safePath('/users/:id', { name: 'john' })  // Wrong parameter
    // app.safePath('/users/:id')  // Missing required parameter
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
  
  // Test all route types
  expect(app.safePath('/')).toBe('/')
  expect(app.safePath('/about')).toBe('/about')
  expect(app.safePath('/users')).toBe('/users')
  expect(app.safePath('/users/:id', { id: 'john' })).toBe('/users/john')
  expect(app.safePath('/users/:id/posts', { id: '123' })).toBe('/users/123/posts')
  expect(app.safePath('/users/:userId/posts/:postId', { 
    userId: 'alice', 
    postId: 'my-post' 
  })).toBe('/users/alice/posts/my-post')
  expect(app.safePath('/search/:query?')).toBe('/search/')
  expect(app.safePath('/search/:query?', { query: 'typescript' })).toBe('/search/typescript')
})