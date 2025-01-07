```typescript
// POST /vault.v1.VaultService/Encrypt - tags: vault
async encrypt(request: V1EncryptRequestBody): Promise<V1EncryptResponseBody> {
  const response = await this.fetch({
    method: 'POST',
    path: '/vault.v1.VaultService/Encrypt',
    body: request
  });

  if (!response.ok) {
    const error = await response.json();
    throw new ExampleError(error.detail || 'Encryption failed', {
      status: response.status,
      data: error
    });
  }

  return response.json();
}

// Type definitions
interface V1EncryptRequestBody {
  $schema?: string;
  data: string;
  keyring: string;
}

interface V1EncryptResponseBody {
  $schema?: string;
  encrypted: string;
  keyId: string;
}
```