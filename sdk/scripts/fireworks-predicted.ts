import { createFireworks } from '@ai-sdk/fireworks'
import { openai } from '@ai-sdk/openai'
import { generateText } from 'ai'

const fireworks = createFireworks({
  apiKey: process.env.FIREWORKS_API_KEY ?? '',
})
import { streamText } from 'ai'
const code = `
\`\`\`go
package main

import(
    "context"
    dubgo "github.com/dubinc/dub-go"
    "github.com/dubinc/dub-go/models/operations"
    "log"
)

func main() {
    ctx := context.Background()

    s := dubgo.New(
        dubgo.WithSecurity("DUB_API_KEY"),
    )

    res, err := s.Links.Create(ctx, &operations.CreateLinkRequestBody{
        URL: "https://google.com",
        ExternalID: dubgo.String("123456"),
        TagIds: dubgo.Pointer(operations.CreateTagIdsArrayOfStr(
            []string{
                "clux0rgak00011...",
            },
        )),
    })
    if err != nil {
        log.Fatal(err)
    }
    if res != nil {
        // handle response
    }
}
\`\`\`
`
async function main() {
  let model = fireworks('accounts/fireworks/models/llama-v3p3-70b-instruct')
  //   model = openai('gpt-4o-mini')
  const stream = streamText({
    model,
    prompt: `Echo this exact code for me, only output the code:\n${code}`,
    experimental_providerMetadata: {
      prediction: {
        type: 'content',
        content: code,
      },
    },
  })

  const startTime = Date.now()
  for await (const part of stream.textStream) {
    process.stdout.write(part)
  }
  const endTime = Date.now()
  console.log(`Time taken: ${endTime - startTime}ms`)
}

main()
