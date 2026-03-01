Let's analyze what needs to be done:

1. The route `/errorWithSchema` has been deleted from the OpenAPI schema
2. We need to remove the corresponding method from the SDK
3. The method to remove is `get_error_with_schema` in the `ExampleClientAsync` class
4. No other changes are needed since this was the only reference to this route

Here's the code to remove:

```python:example_client_async.py
class ExampleClientAsync:
    # ... existing code ...

    # Remove this method
    # GET /errorWithSchema
    # Tags: example-tag
    async def get_error_with_schema(self) -> Dict[str, str]:
        """Always throws an error for testing error handling"""
        response = await self.fetch("GET", "/errorWithSchema")
        
        if response.status >= 400:
            try:
                error_data = await response.json()
                if "message" in error_data:
                    raise ExampleError(
                        error=error_data["message"],
                        status=response.status,
                        data=error_data
                    )
            except (json.JSONDecodeError, aiohttp.ContentTypeError):
                pass
            raise ExampleError(
                error=f"Request failed with status {response.status}",
                status=response.status
            )
        
        return await response.json()

    # ... rest of the class ...
```

The rest of the SDK code can remain unchanged as it doesn't reference this method elsewhere. The removal of this method aligns the SDK with the current OpenAPI schema.