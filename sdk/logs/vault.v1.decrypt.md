```typescript:src/client.ts
// POST /vault.v1.VaultService/Decrypt - tags: vault
async decrypt(
  request: V1DecryptRequestBody
): Promise<V1DecryptResponseBody> {
  const response = await this.fetch({
    method: 'POST',
    path: '/vault.v1.VaultService/Decrypt',
    body: request
  });

  if (!response.ok) {
    const error = await response.json();
    throw new ExampleError(error.detail || 'Failed to decrypt', {
      status: response.status,
      data: error
    });
  }

  return response.json();
}

// Type definitions
interface V1DecryptRequestBody {
  keyring: string;
  encrypted: string;
  $schema?: string;
}

interface V1DecryptResponseBody {
  plaintext: string;
  $schema?: string;
}
```