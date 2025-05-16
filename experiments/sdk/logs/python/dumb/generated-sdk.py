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
        form_data: Optional[aiohttp.FormData] = None,
    ) -> Any:
        url = urllib.parse.urljoin(self.base_url, path)

        if query:
            params = []
            for key, value in query.items():
                if value is not None:
                    params.append(f"{key}={urllib.parse.quote(str(value))}")
            if params:
                url = f"{url}?{'&'.join(params)}"

        request_headers = {}
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
                data=form_data if form_data is not None else None,
            ) as response:
                return response

    # GET / - x-fern-sdk-group-name: one, x-fern-sdk-method-name: take
    async def take(self) -> Any:
        """Make a GET request to the root endpoint"""
        try:
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
                
            return await response.json()
        except aiohttp.ClientError as e:
            raise ExampleError(
                error=f"Network error: {str(e)}",
                status=500,
            ) from e

    # GET /stream
    # Method: GET
    # Tags: example-tag
    async def stream(self) -> AsyncGenerator[Dict[str, float], None]:
        """Returns an async generator for the stream endpoint.
        
        Uses server sent events and yields parsed JSON objects with count and timestamp.
        """
        response = await self.fetch(
            method="GET",
            path="/stream",
            headers={"Accept": "text/event-stream"}
        )
        
        if response.status != 200:
            raise ExampleError(
                f"Unexpected status code: {response.status}",
                status=response.status,
                data=await response.text()
            )
            
        async for event in stream_sse_response(response):
            yield event

    # GET /users/{id} - example-tag
    async def get_user(self, id: str) -> Any:
        """Get user by ID
        
        Args:
            id: User ID to retrieve
            
        Returns:
            Any: The user data
            
        Raises:
            ExampleError: If the API returns an error
        """
        response = await self.fetch(
            method="GET",
            path=f"/users/{id}"
        )
        
        if response.status != 200:
            error_data = await response.json()
            raise ExampleError(
                error=f"Failed to get user: {error_data.get('message', 'Unknown error')}",
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
            Success message from the API
            
        Raises:
            ExampleError: If the API returns an error
        """
        body = {
            "name": name,
            "email": email,
            "age": age,
        }
        
        response = await self.fetch(
            method="POST",
            path="/users",
            body=body,
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
    # Method: GET
    # Tags: example-tag
    async def get_error(self) -> None:
        """Always throws an error for testing error handling"""
        response = await self.fetch("GET", "/error")
        
        if response.status >= 400:
            try:
                error_data = await response.json()
                raise ExampleError(
                    error=error_data.get("error", "Unknown error"),
                    status=response.status,
                    data=error_data
                )
            except (json.JSONDecodeError, aiohttp.ContentTypeError):
                raise ExampleError(
                    error=await response.text(),
                    status=response.status
                )

    # GET /errorWithSchema
    # Method: GET
    # Tags: example-tag
    async def get_error_with_schema(self) -> Dict[str, str]:
        """Always throws an error for testing error handling"""
        response = await self.fetch(
            method="GET",
            path="/errorWithSchema",
        )
        
        if response.status != 200:
            try:
                error_data = await response.json()
            except:
                error_data = None
            raise ExampleError(
                error=f"Request failed with status {response.status}",
                status=response.status,
                data=error_data,
            )
            
        return await response.json()

    # POST /upload
    # Tags: (none)
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
        data = aiohttp.FormData()
        data.add_field('file', file_content)
        
        response = await self.fetch(
            method="POST",
            path="/upload",
            body=None,
            headers={"Content-Type": "multipart/form-data"},
            form_data=data
        )
        
        if response.status != 200:
            error_data = await response.json() if response.content_type == "application/json" else await response.text()
            raise ExampleError(
                f"Upload failed with status {response.status}",
                status=response.status,
                data=error_data
            )
            
        return await response.json() if response.content_type == "application/json" else await response.text()

    # GET /openapi
    # tags: 
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
                status=response.status,
                data=await response.text()
            )
            
        return await response.json()


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








