import { describe, test, expect, afterEach, beforeEach } from 'vitest'
import { serve } from '../../src/server/node.js'
import { createTestApi } from './common/test-api.js'
import { verifyBasicEndpoints } from './common/setup.js'
import { Server } from '../../src/server/base.js'

describe('Node.js Runtime Integration Tests', () => {
  let server: Server
  let baseUrl: string
  
  beforeEach(async () => {
    const testApp = createTestApi()
    const port = 3001 + Math.floor(Math.random() * 1000) // Random port to avoid conflicts
    
    server = await serve(testApp, {
      port,
      onListen: () => console.log(`Test server started on http://localhost:${port}`)
    })
    
    baseUrl = `http://localhost:${port}`
  })
  
  afterEach(async () => {
    if (server) {
      await server.close()
    }
  })
  
  test('should handle basic HTTP endpoints correctly', async () => {
    // Test each endpoint individually for better error reporting
    
    // Root endpoint
    let response = await fetch(`${baseUrl}/`)
    expect(response.status).toBe(200)
    let text = await response.text()
    expect(text).toBe('Hello World!')
    
    // JSON endpoint
    response = await fetch(`${baseUrl}/json`)
    expect(response.status).toBe(200)
    let json = await response.json()
    expect(json).toEqual({ message: 'Hello World!', success: true })
    
    // Path parameter endpoint
    response = await fetch(`${baseUrl}/users/123`)
    expect(response.status).toBe(200)
    json = await response.json()
    expect(json).toEqual({ id: '123', name: 'User 123' })
    
    // Query parameter endpoint
    response = await fetch(`${baseUrl}/search?q=test`)
    expect(response.status).toBe(200)
    json = await response.json()
    expect(json.query).toBe('test')
    expect(json.results).toContain('Result for test')
  })
  
  test('should handle 404 for non-existent routes', async () => {
    const response = await fetch(`${baseUrl}/non-existent-path`)
    expect(response.status).toBe(404)
  })
  
  test('should handle HEAD requests', async () => {
    const response = await fetch(`${baseUrl}/json`, { method: 'HEAD' })
    expect(response.status).toBe(200)
    const text = await response.text()
    expect(text).toBe('') // HEAD requests should have empty bodies
  })
})
