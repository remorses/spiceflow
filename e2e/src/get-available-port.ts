import { createServer } from 'node:net'

export async function getAvailablePort(startPort = 4000, maxRetries = 10) {
  return await new Promise<number>((resolve, reject) => {
    let port = startPort
    let attempts = 0

    const checkPort = () => {
      const server = createServer()

      server.once('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
          attempts++
          if (attempts >= maxRetries) {
            reject(new Error('No available ports found'))
          } else {
            port++
            checkPort()
          }
        } else {
          reject(err)
        }
      })

      server.once('listening', () => {
        server.close(() => {
          resolve(port)
        })
      })

      server.listen(port)
    }

    checkPort()
  })
}
