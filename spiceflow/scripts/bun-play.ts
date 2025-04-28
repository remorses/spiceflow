import { Spiceflow } from '../src/spiceflow.js'

const app = new Spiceflow()
  .get('/', () => {
    console.log('running')
    return new Response('Hello World')
  })
  .get('/id/:id', (c) => {
    const responseBody = `${c.params.id} ${c.query.name}`
    const headers = new Headers({
      'x-powered-by': 'benchmark',
    })

    return new Response(responseBody, { headers })
  })
  .post('/json', (c) => c.request.json(), {
    type: 'json',
  })

app.listen(3020)
