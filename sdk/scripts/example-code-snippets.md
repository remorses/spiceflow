Here are the code snippets for each language:

TypeScript:

```typescript
import { Dub } from 'dub'

const dub = new Dub({
  token: 'DUB_API_KEY',
})

async function run() {
  const result = await dub.links.create()

  // Handle the result
  console.log(result)
}

run()
```

Go:

```go
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
```

Ruby:

```ruby
require 'dub'

s = ::OpenApiSDK::Dub.new
s.config_security(
  ::OpenApiSDK::Shared::Security.new(
    token: "DUB_API_KEY",
  )
)

req = ::OpenApiSDK::Operations::CreateLinkRequestBody.new(
  url: "https://google.com",
  external_id: "123456",
  tag_ids: [
    "clux0rgak00011...",
  ],
)

res = s.links.create(req)

if ! res.link_schema.nil?
  # handle response
end
```

PHP:

```php
declare(strict_types=1);

require 'vendor/autoload.php';

use Dub;
use Dub\Models\Operations;

$security = 'DUB_API_KEY';

$sdk = Dub\Dub::builder()->setSecurity($security)->build();

$request = new Operations\CreateLinkRequestBody(
    url: 'https://google.com',
    externalId: '123456',
    tagIds: [
        'clux0rgak00011...',
    ],
);

$response = $sdk->links->create(
    request: $request
);

if ($response->linkSchema !== null) {
    // handle response
}
```

Python:

```python
from dub import Dub

with Dub(
    token="DUB_API_KEY",
) as dub:

    res = dub.links.create(request={
        "url": "https://google.com",
        "external_id": "123456",
        "tag_ids": [
            "clux0rgak00011...",
        ],
    })

    assert res is not None

    # Handle response
    print(res)
```

Java:

```java
OkHttpClient client = new OkHttpClient();

MediaType mediaType = MediaType.parse("application/json");
RequestBody body = RequestBody.create(mediaType, "{\"url\":\"https://google.com\",\"domain\":\"string\",\"key\":\"string\",\"externalId\":\"123456\",\"prefix\":\"string\",\"trackConversion\":false,\"archived\":false,\"tagIds\":\"string\",\"tagNames\":\"string\",\"comments\":\"string\",\"expiresAt\":\"string\",\"expiredUrl\":\"string\",\"password\":\"string\",\"proxy\":false,\"title\":\"string\",\"description\":\"string\",\"image\":\"string\",\"video\":\"string\",\"rewrite\":false,\"ios\":\"string\",\"android\":\"string\",\"geo\":{...}}");
Request request = new Request.Builder()
  .url("https://api.dub.co/links")
  .post(body)
  .addHeader("accept", "application/json")
  .addHeader("content-type", "application/json")
  .addHeader("authorization", "Bearer MY_TOKEN")
  .build();

Response response = client.newCall(request).execute();
```
