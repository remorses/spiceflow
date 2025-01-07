```typescript:src/client.ts
// POST /vault.v1.VaultService/EncryptBulk - Encrypt multiple pieces of data
// Method: POST
// Tags: vault
async encryptBulk(
  request: V1EncryptBulkRequestBody
): Promise<V1EncryptBulkResponseBody> {
  const response = await this.fetch({
    method: 'POST',
    path: '/vault.v1.VaultService/EncryptBulk',
    body: request,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new ExampleError(error.detail || 'Failed to encrypt bulk data', {
      status: response.status,
      data: error,
    });
  }

  return response.json();
}

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