Let's implement the `/v1/liveness` endpoint step by step:

1. First, we need to define the response type for the liveness check
2. Then we'll create the async method in the ExampleClientAsync class
3. The method will:
   - Make a GET request to /v1/liveness
   - Handle the response
   - Return the parsed response data
   - Handle error cases

Here's the implementation:

```python
# ... existing code ...

class V1LivenessResponseBody:
    def __init__(self, message: str):
        self.message = message

    @classmethod
    def from_dict(cls, data: dict) -> "V1LivenessResponseBody":
        return cls(message=data["message"])

class ExampleClientAsync:
    # ... existing code ...

    # GET /v1/liveness
    # Tags: liveness
    async def get_liveness(self) -> V1LivenessResponseBody:
        response = await self.fetch(
            method="GET",
            path="/v1/liveness"
        )
        
        if response.status == 200:
            data = await response.json()
            return V1LivenessResponseBody.from_dict(data)
        elif response.status == 500:
            error_data = await response.json()
            raise ExampleError(
                error=error_data.get("detail", "Internal Server Error"),
                status=500,
                data=error_data
            )
        else:
            raise ExampleError(
                error=f"Unexpected status code: {response.status}",
                status=response.status
            )
```