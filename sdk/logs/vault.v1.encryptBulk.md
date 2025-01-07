```typescript
/**
 * POST /vault.v1.VaultService/EncryptBulk
 * Encrypt multiple pieces of data in bulk.
 * Tags: vault
 */
export class VaultService {
  private client: ExampleClient;

  constructor(client: ExampleClient) {
    this.client = client;
  }

  async encryptBulk(
    request: V1EncryptBulkRequestBody
  ): Promise<V1EncryptBulkResponseBody> {
    const response = await this.client.fetch({
      method: "POST",
      path: "/vault.v1.VaultService/EncryptBulk",
      body: request,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ExampleError("Failed to encrypt bulk data", {
        status: response.status,
        data: errorData,
      });
    }

    return response.json();
  }
}

// Type Definitions
interface V1EncryptBulkRequestBody {
  $schema?: string;
  data: string[];
  keyring: string;
}

interface V1EncryptBulkResponseBody {
  $schema?: string;
  encrypted: Encrypted[];
}

interface Encrypted {
  encrypted: string;
  keyId: string;
}
```