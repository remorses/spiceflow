import { app } from './example-app'
import { ExampleSdkClient } from './sdk-typescript'

async function main() {
  const port = 3340
  let server = await app.listen(port)
  const sdk = new ExampleSdkClient({
    environment: 'http://localhost:' + port,
    token: '123',
  })
  // Get index
  console.log('Get index:', await sdk.getIndex())

  // Get stream data
  const stream = await sdk.getStream()
  for await (const data of stream) {
    console.log('Stream data:', data)
  }

  // Get user by ID
  console.log('Get user by ID:', await sdk.getUsersById('123'))

  // Create new user
  console.log(
    'Create new user:',
    await sdk.postUsers({
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
    }),
  )

  console.log(
    'Upload data:',
    await sdk.postUpload({ file: Buffer.from('sdfsdf').toString('base64') }),
  )

  // Get OpenAPI spec
  // console.log('Get OpenAPI spec:', await sdk.getOpenapi())
  await server.close()
}

main().catch(console.error)
