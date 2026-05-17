import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'

import { createSpiceflowFetch } from '../src/client/index.js'
import { app } from './example-app.js'

async function main() {
  console.log('Creating Spiceflow fetch client...')
  const f = createSpiceflowFetch(app)

  console.log('Fetching OpenAPI spec...')
  const openapiJson = await f('/openapi')
  if (openapiJson instanceof Error) {
    console.error('Failed to fetch OpenAPI spec:', openapiJson)
    throw openapiJson
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
}

main().catch((e) => {
  console.error('Failed to generate OpenAPI spec:', e)
  process.exit(1)
})
