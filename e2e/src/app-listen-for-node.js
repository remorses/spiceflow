import { Spiceflow } from 'spiceflow'

const port = process.env.SPICEFLOW_PORT
if (!port) {
  throw new Error('SPICEFLOW_PORT environment variable is not set')
}

const app = new Spiceflow().get('/hello', () => 'Hello, World!')

app.listenForNode(Number(port))
