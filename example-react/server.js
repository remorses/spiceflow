import handler from './dist/ssr/index.js'

import http from 'node:http'

const server = http.createServer((req, res) => {
  handler(req, res)
})

const port = process.env.PORT || 3000
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`)
})
