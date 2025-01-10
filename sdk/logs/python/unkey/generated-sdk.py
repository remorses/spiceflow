import json
import aiohttp
import urllib.parse
from typing import Any, AsyncGenerator, Dict, Optional, Union
# types.py is in the same directory as this file
import types as Types



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

    # POST /v0/events - tags: events
    async def create_events(self, payload: str) -> Types.V0EventsResponseBody:
        """
        Create events by sending NDJSON payload.
        
        Args:
            payload: NDJSON formatted string of events
            
        Returns:
            V0EventsResponseBody: Response containing processing statistics
            
        Raises:
            ExampleError: If the request fails with status code 400 or 500
        """
        headers = {"Content-Type": "application/x-ndjson"}
        response = await self.fetch(
            method="POST",
            path="/v0/events",
            body=payload,
            headers=headers
        )
        
        if response.status == 200:
            return Types.V0EventsResponseBody(**await response.json())
        elif response.status == 400:
            error_data = await response.json()
            raise ExampleError(
                error="Validation Error",
                status=400,
                data=Types.ValidationError(**error_data)
            )
        elif response.status == 500:
            error_data = await response.json()
            raise ExampleError(
                error="Server Error",
                status=500,
                data=Types.BaseError(**error_data)
            )
        else:
            raise ExampleError(
                error=f"Unexpected status code: {response.status}",
                status=response.status,
                data=await response.text()
            )

    # POST /ratelimit.v1.RatelimitService/MultiRatelimit
    # Tags: ratelimit
    async def multi_ratelimit(
        self, request: Types.V1RatelimitMultiRatelimitRequestBody
    ) -> Types.V1RatelimitMultiRatelimitResponseBody:
        response = await self.fetch(
            method="POST",
            path="/ratelimit.v1.RatelimitService/MultiRatelimit",
            body=request,
        )
        
        if response.status == 200:
            return Types.V1RatelimitMultiRatelimitResponseBody(**await response.json())
        elif response.status == 400:
            error_data = await response.json()
            raise ExampleError(
                error="Validation Error",
                status=400,
                data=Types.ValidationError(**error_data)
            )
        elif response.status == 500:
            error_data = await response.json()
            raise ExampleError(
                error="Server Error",
                status=500,
                data=Types.BaseError(**error_data)
            )
        else:
            raise ExampleError(
                error=f"Unexpected status code: {response.status}",
                status=response.status,
                data=await response.text()
            )

    # POST /ratelimit.v1.RatelimitService/Ratelimit
    # Tags: ratelimit
    async def ratelimit(
        self, request: Types.V1RatelimitRatelimitRequestBody
    ) -> Types.V1RatelimitRatelimitResponseBody:
        """
        Make a ratelimit request
        
        Args:
            request: The ratelimit request parameters
            
        Returns:
            V1RatelimitRatelimitResponseBody: The ratelimit response
            
        Raises:
            ExampleError: If the API returns an error (400 or 500 status code)
        """
        response = await self.fetch(
            method="POST",
            path="/ratelimit.v1.RatelimitService/Ratelimit",
            body=request,
        )
        
        if response.status == 200:
            return Types.V1RatelimitRatelimitResponseBody(**await response.json())
        elif response.status == 400:
            error_data = await response.json()
            raise ExampleError(
                error="Validation Error",
                status=400,
                data=Types.ValidationError(**error_data)
            )
        elif response.status == 500:
            error_data = await response.json()
            raise ExampleError(
                error="Server Error",
                status=500,
                data=Types.BaseError(**error_data)
            )
        else:
            raise ExampleError(
                error=f"Unexpected status code: {response.status}",
                status=response.status,
                data=await response.text()
            )

    # GET /v1/liveness
    # tags: liveness
    async def liveness(self) -> Types.V1LivenessResponseBody:
        """
        This endpoint checks if the service is alive.
        """
        response = await self.fetch(
            method="GET",
            path="/v1/liveness"
        )
        
        if response.status == 200:
            data = await response.json()
            return Types.V1LivenessResponseBody(
                message=data["message"],
                schema=data.get("$schema")
            )
        elif response.status == 500:
            error_data = await response.json()
            raise ExampleError(
                error=error_data["detail"],
                status=500,
                data=Types.BaseError(
                    detail=error_data["detail"],
                    instance=error_data["instance"],
                    request_id=error_data["requestId"],
                    status=error_data["status"],
                    title=error_data["title"],
                    type=error_data["type"]
                )
            )
        else:
            raise ExampleError(
                error=f"Unexpected status code: {response.status}",
                status=response.status
            )

    # POST /v1/ratelimit.commitLease - tags: ratelimit
    async def commit_ratelimit_lease(
        self, body: Types.V1RatelimitCommitLeaseRequestBody
    ) -> None:
        """
        Commit a ratelimit lease.

        Args:
            body: The request body containing lease information

        Raises:
            ExampleError: If the API returns a 400 or 500 status code
        """
        response = await self.fetch(
            method="POST",
            path="/v1/ratelimit.commitLease",
            body=body,
        )

        if response.status == 204:
            return None
        elif response.status == 400:
            error_data = await response.json()
            raise ExampleError(
                error="Bad Request",
                status=400,
                data=Types.ValidationError(**error_data),
            )
        elif response.status == 500:
            error_data = await response.json()
            raise ExampleError(
                error="Internal Server Error",
                status=500,
                data=Types.BaseError(**error_data),
            )
        else:
            raise ExampleError(
                error=f"Unexpected status code: {response.status}",
                status=response.status,
                data=await response.text(),
            )

    # POST /vault.v1.VaultService/Decrypt
    # Tags: vault
    async def decrypt(
        self, 
        request: Types.V1DecryptRequestBody
    ) -> Types.V1DecryptResponseBody:
        """
        Decrypts the provided encrypted value using the specified keyring.

        Args:
            request: The decryption request containing the encrypted data and keyring

        Returns:
            The decrypted plaintext value

        Raises:
            ExampleError: If the request fails with a 400 or 500 status code
        """
        response = await self.fetch(
            method="POST",
            path="/vault.v1.VaultService/Decrypt",
            body=request,
        )

        if response.status == 200:
            return Types.V1DecryptResponseBody(**await response.json())
        elif response.status == 400:
            error_data = await response.json()
            raise ExampleError(
                error="Validation Error",
                status=400,
                data=Types.ValidationError(**error_data)
            )
        elif response.status == 500:
            error_data = await response.json()
            raise ExampleError(
                error="Server Error",
                status=500,
                data=Types.BaseError(**error_data)
            )
        else:
            raise ExampleError(
                error=f"Unexpected status code: {response.status}",
                status=response.status,
                data=await response.text()
            )

    # POST /vault.v1.VaultService/Encrypt
    # Tags: vault
    async def encrypt(
        self, 
        request: Types.V1EncryptRequestBody
    ) -> Types.V1EncryptResponseBody:
        """
        Encrypt data using the specified keyring.

        Args:
            request: V1EncryptRequestBody containing data and keyring

        Returns:
            V1EncryptResponseBody with encrypted data and key ID

        Raises:
            ExampleError: If the request fails with 400 or 500 status code
        """
        response = await self.fetch(
            method="POST",
            path="/vault.v1.VaultService/Encrypt",
            body=request,
        )

        if response.status == 200:
            return Types.V1EncryptResponseBody(**await response.json())
        elif response.status == 400:
            error_data = await response.json()
            raise ExampleError(
                error="Validation error",
                status=400,
                data=Types.ValidationError(**error_data)
            )
        elif response.status == 500:
            error_data = await response.json()
            raise ExampleError(
                error="Server error",
                status=500,
                data=Types.BaseError(**error_data)
            )
        else:
            raise ExampleError(
                error=f"Unexpected status code: {response.status}",
                status=response.status,
                data=await response.text()
            )

    # POST /vault.v1.VaultService/EncryptBulk - tags: vault
    async def encrypt_bulk(self, request: Types.V1EncryptBulkRequestBody) -> Types.V1EncryptBulkResponseBody:
        """
        Encrypt multiple pieces of data in bulk using the specified keyring.

        Args:
            request: The request body containing data to encrypt and keyring identifier

        Returns:
            V1EncryptBulkResponseBody: Response containing encrypted data

        Raises:
            ExampleError: If the API returns an error response (400 or 500)
        """
        response = await self.fetch(
            method="POST",
            path="/vault.v1.VaultService/EncryptBulk",
            body=request,
        )
        
        if response.status == 200:
            return Types.V1EncryptBulkResponseBody(**await response.json())
        elif response.status == 400:
            error_data = await response.json()
            raise ExampleError(
                error="Validation error",
                status=400,
                data=Types.ValidationError(**error_data)
            )
        elif response.status == 500:
            error_data = await response.json()
            raise ExampleError(
                error="Server error",
                status=500,
                data=Types.BaseError(**error_data)
            )
        else:
            raise ExampleError(
                error=f"Unexpected status code: {response.status}",
                status=response.status,
                data=await response.text()
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








