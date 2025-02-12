import sirv from 'sirv'
import handler from 'spiceflow/dist/react/entry.ssr'
import polka from 'polka'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Init `sirv` handler
const assets = sirv(path.join(__dirname, '../client/assets'), {
  maxAge: 31536000, // 1Y
  immutable: true,
})
const client = sirv(path.join(__dirname, '../client'), {
  maxAge: 5, // 1Y
  immutable: false,
})

const app = polka()

app
  .use('/assets', assets)
  .use('/', client)
  .use(handler)
  .listen(process.env.PORT || 3000, () => {
    console.log(
      `Server running at http://localhost:${process.env.PORT || 3000}`,
    )
  })
