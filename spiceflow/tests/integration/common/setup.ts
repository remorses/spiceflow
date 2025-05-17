/**
 * Common test utilities for all runtime integration tests
 */

/**
 * Verifies a response from the test API
 */
export async function verifyResponse(response: Response, expectedStatus = 200): Promise<void> {
  if (response.status !== expectedStatus) {
    throw new Error(`Expected status ${expectedStatus}, got ${response.status}`)
  }
}

/**
 * Verifies the basic endpoints of our test API
 */
export async function verifyBasicEndpoints(baseUrl: string): Promise<boolean> {
  try {
    // Test root endpoint
    let response = await fetch(`${baseUrl}/`)
    await verifyResponse(response)
    const rootText = await response.text()
    if (rootText !== 'Hello World!') {
      throw new Error(`Unexpected response: ${rootText}`)
    }
    
    // Test JSON endpoint
    response = await fetch(`${baseUrl}/json`)
    await verifyResponse(response)
    const jsonData = await response.json()
    if (jsonData.message !== 'Hello World!' || jsonData.success !== true) {
      throw new Error(`Unexpected response: ${JSON.stringify(jsonData)}`)
    }
    
    // Test path parameter endpoint
    response = await fetch(`${baseUrl}/users/123`)
    await verifyResponse(response)
    const userData = await response.json()
    if (userData.id !== '123' || userData.name !== 'User 123') {
      throw new Error(`Unexpected response: ${JSON.stringify(userData)}`)
    }
    
    // Test query parameter endpoint
    response = await fetch(`${baseUrl}/search?q=test`)
    await verifyResponse(response)
    const searchData = await response.json()
    if (searchData.query !== 'test' || !searchData.results.includes('Result for test')) {
      throw new Error(`Unexpected response: ${JSON.stringify(searchData)}`)
    }
    
    // Test POST endpoint
    response = await fetch(`${baseUrl}/echo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello Server!' })
    })
    await verifyResponse(response)
    const echoData = await response.json()
    if (!echoData.echo || echoData.echo.message !== 'Hello Server!') {
      throw new Error(`Unexpected response: ${JSON.stringify(echoData)}`)
    }
    
    // Test stream endpoint
    response = await fetch(`${baseUrl}/stream`)
    await verifyResponse(response)
    const streamText = await response.text()
    if (!streamText.includes('data: hello') || !streamText.includes('data: world')) {
      throw new Error(`Unexpected response: ${streamText}`)
    }
    
    return true
  } catch (error) {
    console.error('Test failed:', error)
    return false
  }
}
