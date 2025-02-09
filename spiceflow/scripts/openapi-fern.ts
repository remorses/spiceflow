import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'

import { createSpiceflowClient } from "../src/client.js"
import { app } from './example-app.js'

async function main() {
  console.log('Creating Spiceflow client...')
  const client = createSpiceflowClient(app)

  console.log('Fetching OpenAPI spec...')
  const { data: openapiJson, error } = await client.openapi.get()
  if (error) {
    console.error('Failed to fetch OpenAPI spec:', error)
    throw error
  }

  const outputPath = path.resolve('./scripts/openapi.yml')
  console.log('Writing OpenAPI spec to', outputPath)
  fs.writeFileSync(
    outputPath,
    yaml.dump(openapiJson, {
      indent: 2,
      lineWidth: -1,
    }),
  )
  console.log('Successfully wrote OpenAPI spec')
  // Log any unhandled promises before exiting
  // const unhandledHandles = process._getActiveHandles()
  // if (unhandledHandles.length > 0) {
  //     console.log('Warning: Found unhandled handles:', unhandledHandles.length)
  //     unhandledHandles.forEach((handle, i) => {
  //         console.log(`Handle ${i + 1}:`, handle)
  //     })
  // }
}

main().catch((e) => {
  console.error('Failed to generate OpenAPI spec:', e)
  process.exit(1)
})
