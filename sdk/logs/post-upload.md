```typescript
interface UploadFileRequest {
  file: string;
}

export class ExampleClient {
  // ... existing code ...

  async uploadFile(fileData: UploadFileRequest): Promise<any> {
    const path = '/upload';
    const headers = {
      Authorization: this.token ? `Bearer ${this.token}` : '',
    };

    const formData = new FormData();
    formData.append('file', fileData.file);

    const url = new URL(path, this.baseUrl);

    const options: RequestInit = {
      method: 'POST',
      headers,
      body: formData,
    };

    try {
      const response = await fetch(url.toString(), options);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new ExampleError('Failed to upload file', {
          status: response.status,
          data: errorData,
        });
      }

      return response.json();
    } catch (error) {
      if (error instanceof ExampleError) {
        throw error;
      }
      throw new ExampleError('Network error', { status: 500 });
    }
  }
}
```