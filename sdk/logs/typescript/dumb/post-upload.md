I'll add the `/upload` route implementation to the existing SDK. Here's the new code:

```typescript:exampleClient.ts
export class ExampleClient {
  // ... existing code ...

  /**
   * POST /upload
   * @tags example-tag
   */
  async uploadFile(body: { file: string }): Promise<any> {
    const formData = new FormData();
    const blob = new Blob([Buffer.from(body.file, 'base64')], { type: 'application/octet-stream' });
    formData.append('file', blob);

    const response = await this.fetch({
      method: 'POST',
      path: '/upload',
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });

    if (!response.ok) {
      throw new ExampleError('Upload failed', {
        status: response.status,
        data: await response.json().catch(() => undefined),
      });
    }

    return response.json();
  }
}

// Global scope declarations
declare const Buffer: {
  from(data: string, encoding: 'base64'): ArrayBuffer;
};
```