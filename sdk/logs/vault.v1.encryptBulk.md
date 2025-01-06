```typescript
/**
 * POST /vault.v1.VaultService/EncryptBulk
 * Encrypt multiple pieces of data in bulk
 * Tags: vault
 */
export async function encryptBulk(
  body: V1EncryptBulkRequestBody,
  options?: { headers?: Record<string, string> }
): Promise<V1EncryptBulkResponseBody> {
  const response = await fetch('/vault.v1.VaultService/EncryptBulk', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new ExampleError('Failed to encrypt bulk data', {
      status: response.status,
      data: errorData,
    });
  }

  return response.json();
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

interface ExampleError extends Error {
  status: number;
  data: any;
}
```