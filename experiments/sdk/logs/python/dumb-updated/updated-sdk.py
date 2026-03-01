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

    # GET / - Route path: "/", Method: "GET", Tags: []
    async def take(self) -> Any:
        """Make a GET request to the root endpoint"""
        response = await self.fetch("GET", "/")
        
        if response.status != 200:
            raise ExampleError(
                f"Request failed with status {response.status}",
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
    async def get_stream(self) -> AsyncGenerator[Dict[str, float], None]:
        """Stream Endpoint
        
        Returns an async generator when used in the SDK
        
        - Uses server sent events
        - But also has a response schema
        """
        response = await self.fetch("GET", "/stream")
        
        if response.status != 200:
            raise ExampleError(
                f"Unexpected status code: {response.status}",
                status=response.status,
                data=await response.text(),
            )
            
        async for event in stream_sse_response(response):
            yield event

    # GET /users/{id} - example-tag
    async def get_user(self, id: str) -> Any:
        """Get user by ID
        
        Args:
            id: User ID to retrieve
            
        Returns:
            Response data from the API
            
        Raises:
            ExampleError: If the API returns an error
        """
        response = await self.fetch("GET", f"/users/{id}")
        
        if response.status != 200:
            try:
                error_data = await response.json()
                raise ExampleError(
                    error=error_data.get("message", "Unknown error"),
                    status=response.status,
                    data=error_data
                )
            except (json.JSONDecodeError, aiohttp.ContentTypeError):
                raise ExampleError(
                    error=f"Request failed with status {response.status}",
                    status=response.status
                )
                
        try:
            return await response.json()
        except (json.JSONDecodeError, aiohttp.ContentTypeError):
            return await response.text()

    # POST /users
    # Tags: example-tag
    async def create_user(self, name: str, email: str, age: int) -> Dict[str, Any]:
        """
        Create a new user
        
        Args:
            name: User's full name
            email: User's email address
            age: User's age (0-120)
            
        Returns:
            Dictionary containing response message and optional data
            
        Raises:
            ExampleError: If the request fails
        """
        body = {
            "name": name,
            "email": email,
            "age": age
        }
        
        response = await self.fetch(
            method="POST",
            path="/users",
            body=body
        )
        
        if response.status != 200:
            try:
                error_data = await response.json()
                raise ExampleError(
                    error=error_data.get("message", "Failed to create user"),
                    status=response.status,
                    data=error_data
                )
            except (json.JSONDecodeError, aiohttp.ContentTypeError):
                raise ExampleError(
                    error=f"Unexpected response: {response.status}",
                    status=response.status
                )
                
        return await response.json()

    # POST /upload
    # tags: []
    async def upload_file(self, file_base64: str) -> Any:
        """
        Upload a file using base64 encoding
        
        Args:
            file_base64: Base64 encoded file content
            
        Returns:
            Response data from the server
            
        Raises:
            ExampleError: If the request fails
        """
        form_data = aiohttp.FormData()
        form_data.add_field('file', file_base64)
        
        response = await self.fetch(
            method="POST",
            path="/upload",
            body=None,
            headers={"Content-Type": "multipart/form-data"},
            form_data=form_data
        )
        
        if response.status >= 400:
            raise ExampleError(
                f"Upload failed with status {response.status}",
                status=response.status
            )
            
        try:
            return await response.json()
        except:
            return await response.text()

    # GET /openapi
    # Method: GET
    # Tags: None
    async def get_openapi(self) -> Any:
        """Fetch the OpenAPI specification"""
        response = await self.fetch("GET", "/openapi")
        
        if response.status != 200:
            raise ExampleError(
                f"Request failed with status code: {response.status}",
                status=response.status,
                data=await response.text(),
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










