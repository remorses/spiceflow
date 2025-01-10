import json
import aiohttp
import urllib.parse
from typing import Any, AsyncGenerator, Dict, Optional, Union


class ExampleClientAsync:
    def __init__(
        self, base_url: str = "http://localhost:3000", token: Optional[str] = None
    ):
        self.base_url = base_url
        self.token = token

    async def fetch(
        self,
        method: str,
        path: str,
        query: Optional[Dict[str, Union[str, int, bool, None]]] = None,
        body: Any = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> Any:
        url = urllib.parse.urljoin(self.base_url, path)

        if query:
            params = []
            for key, value in query.items():
                if value is not None:
                    params.append(f"{key}={urllib.parse.quote(str(value))}")
            if params:
                url = f"{url}?{'&'.join(params)}"

        request_headers = {"Content-Type": "application/json"}
        if self.token:
            request_headers["Authorization"] = f"Bearer {self.token}"
        if headers:
            request_headers.update(headers)

        async with aiohttp.ClientSession() as session:
            async with session.request(
                method=method,
                url=url,
                headers=request_headers,
                json=body if body is not None else None,
            ) as response:
                return response

    # GET / - tags: one
    async def take(self) -> Any:
        """Make a GET request to the root endpoint"""
        response = await self.fetch(
            method="GET",
            path="/",
        )
        
        if response.status != 200:
            raise ExampleError(
                error=f"Unexpected status code: {response.status}",
                status=response.status,
                data=await response.text(),
            )
            
        try:
            return await response.json()
        except aiohttp.ContentTypeError:
            return await response.text()

    # GET /stream
    # Method: GET
    # Tags: example-tag
    async def stream(self) -> AsyncGenerator["StreamResponse", None]:
        """Returns an async generator for the stream endpoint.
        
        Uses server sent events and yields StreamResponse objects.
        """
        response = await self.fetch("GET", "/stream")
        
        if response.status != 200:
            raise ExampleError(
                f"Unexpected status code: {response.status}",
                status=response.status,
                data=await response.text(),
            )
            
        async for event in stream_sse_response(response):
            yield StreamResponse(**event)

    # GET /users/{id}
    # tags: example-tag
    async def get_user(self, id: str) -> Any:
        """Get user by ID
        
        Args:
            id: The user ID to retrieve
            
        Returns:
            The user data
            
        Raises:
            ExampleError: If the request fails
        """
        response = await self.fetch(
            method="GET",
            path=f"/users/{id}"
        )
        
        if response.status != 200:
            error_data = await response.json() if response.content else None
            raise ExampleError(
                error=f"Failed to get user: {response.status}",
                status=response.status,
                data=error_data
            )
            
        return await response.json()

    # POST /users
    # Method: POST
    # Tags: users
    async def create_user(
        self,
        name: str,
        email: str,
        age: float,
    ) -> str:
        """
        Create a new user
        
        Args:
            name: User's full name
            email: User's email address
            age: User's age
            
        Returns:
            The success message from the API
            
        Raises:
            ExampleError: If the API returns an error
        """
        request_body = {
            "name": name,
            "email": email,
            "age": age,
        }
        
        response = await self.fetch(
            method="POST",
            path="/users",
            body=request_body,
        )
        
        if response.status != 200:
            try:
                error_data = await response.json()
            except:
                error_data = None
            raise ExampleError(
                error=f"Failed to create user: {response.status}",
                status=response.status,
                data=error_data,
            )
            
        response_data = await response.json()
        return response_data["message"]

    # GET /error
    # Tags: example-tag
    async def get_error(self) -> None:
        """
        Error Endpoint
        Always throws an error for testing error handling
        """
        response = await self.fetch(
            method="GET",
            path="/error"
        )
        
        if response.status >= 400:
            try:
                error_data = await response.json()
            except:
                error_data = None
            raise ExampleError(
                error=f"Request failed with status {response.status}",
                status=response.status,
                data=error_data
            )

    # GET /errorWithSchema
    # tags: example-tag
    async def get_error_with_schema(self) -> str:
        """
        Always throws an error for testing error handling
        """
        response = await self.fetch(
            method="GET",
            path="/errorWithSchema"
        )
        
        if response.status != 200:
            try:
                error_data = await response.json()
                raise ExampleError(
                    error=f"Request failed with status {response.status}",
                    status=response.status,
                    data=error_data
                )
            except ValueError:
                raise ExampleError(
                    error=f"Request failed with status {response.status}",
                    status=response.status
                )
        
        response_data = await response.json()
        return response_data["message"]

    # POST /upload
    # Tags: (none specified)
    async def upload_file(self, file_content: str) -> Any:
        """
        Upload a base64 encoded file
        
        Args:
            file_content: Base64 encoded file content as string
            
        Returns:
            Response from the server
            
        Raises:
            ExampleError: If the request fails
        """
        form_data = aiohttp.FormData()
        form_data.add_field('file', file_content)
        
        response = await self.fetch(
            method='POST',
            path='/upload',
            body=form_data,
            headers={'Content-Type': 'multipart/form-data'}
        )
        
        if response.status != 200:
            try:
                error_data = await response.json()
            except:
                error_data = await response.text()
            raise ExampleError(
                f"Upload failed with status {response.status}",
                status=response.status,
                data=error_data
            )
            
        return response

    # GET /openapi
    # Tags: 
    async def get_openapi(self) -> Any:
        """Fetch OpenAPI specification
        
        Returns:
            Any: The OpenAPI specification document
        """
        response = await self.fetch(
            method="GET",
            path="/openapi"
        )
        
        if response.status != 200:
            raise ExampleError(
                error=f"Failed to fetch OpenAPI specification: {response.status}",
                status=response.status
            )
            
        try:
            return await response.json()
        except Exception as e:
            raise ExampleError(
                error=f"Failed to parse OpenAPI specification: {str(e)}",
                status=response.status
            )


class ExampleError(Exception):
    def __init__(self, error: str, status: int, data: Any = None):
        super().__init__(error)
        self.status = status
        self.data = data


# this function should not be removed even if not used
async def stream_sse_response(
    response: aiohttp.ClientResponse,
) -> AsyncGenerator[Any, None]:
    if response.content is None:
        return

    async for line in response.content:
        line = line.decode("utf-8")
        if not line.startswith("data: "):
            continue

        data = line[6:].strip()
        if not data:
            continue

        try:
            event = json.loads(data)
            if event.get("event") == "error":
                raise ExampleError(event["data"], status=500)
            yield event
        except json.JSONDecodeError:
            continue


class StreamResponse:
    """Response type for GET /stream"""
    def __init__(self, count: float, timestamp: float):
        self.count = count
        self.timestamp = timestamp








