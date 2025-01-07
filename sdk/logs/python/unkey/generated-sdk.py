import json
import aiohttp
import urllib.parse
from typing import Any, AsyncGenerator, Dict, Optional, Union, TypedDict, NotRequired


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

    # POST /v0/events
    # Tags: events
    async def create_events(self, ndjson_data: str) -> Dict[str, int]:
        """
        Accept NDJSON payload of events and process them
        
        Args:
            ndjson_data: NDJSON formatted string of events
            
        Returns:
            Dict containing successful_rows and quarantined_rows counts
            
        Raises:
            ExampleError: If the request fails with 400 or 500 status
        """
        headers = {"Content-Type": "application/x-ndjson"}
        response = await self.fetch(
            method="POST",
            path="/v0/events",
            body=ndjson_data,
            headers=headers
        )
        
        if response.status == 200:
            return await response.json()
        elif response.status == 400:
            error_data = await response.json()
            raise ExampleError(
                error="Validation Error",
                status=400,
                data=error_data
            )
        elif response.status == 500:
            error_data = await response.json()
            raise ExampleError(
                error="Server Error",
                status=500,
                data=error_data
            )
        else:
            raise ExampleError(
                error=f"Unexpected status code: {response.status}",
                status=response.status,
                data=await response.text()
            )

    # POST /ratelimit.v1.RatelimitService/MultiRatelimit
    # Tags: ratelimit
    async def ratelimit_multi_ratelimit(
        self, ratelimits: list["Item"]
    ) -> "V1RatelimitMultiRatelimitResponseBody":
        """
        Perform multiple rate limit checks in a single request.
        
        Args:
            ratelimits: List of rate limit items to check
            
        Returns:
            Response containing results for each rate limit check
            
        Raises:
            ExampleError: If the request fails (400 or 500 status)
        """
        path = "/ratelimit.v1.RatelimitService/MultiRatelimit"
        body = {"ratelimits": ratelimits}
        
        response = await self.fetch(
            method="POST",
            path=path,
            body=body
        )
        
        if response.status == 200:
            return await response.json()
        elif response.status in (400, 500):
            error_data = await response.json()
            raise ExampleError(
                error=error_data.get("detail", "Unknown error"),
                status=response.status,
                data=error_data
            )
        else:
            raise ExampleError(
                error=f"Unexpected status code: {response.status}",
                status=response.status
            )

    # POST /ratelimit.v1.RatelimitService/Ratelimit
    # Method: ratelimit.v1.ratelimit
    # Tags: ratelimit
    async def ratelimit_v1_ratelimit(
        self,
        identifier: str,
        limit: int,
        duration: int,
        cost: Optional[int] = None,
        lease: Optional["Lease"] = None,
    ) -> "V1RatelimitRatelimitResponseBody":
        """
        Perform a rate limit check for a single identifier.
        
        Args:
            identifier: The identifier for the rate limit
            limit: The maximum number of requests allowed
            duration: The duration in milliseconds for the rate limit window
            cost: The cost of the request (defaults to 1)
            lease: Optional lease configuration for reserving tokens
        
        Returns:
            V1RatelimitRatelimitResponseBody: The rate limit response
        """
        body = {
            "identifier": identifier,
            "limit": limit,
            "duration": duration,
            "cost": cost,
            "lease": lease,
        }
        response = await self.fetch(
            method="POST",
            path="/ratelimit.v1.RatelimitService/Ratelimit",
            body={k: v for k, v in body.items() if v is not None},
        )
        
        if response.status == 200:
            return await response.json()
        elif response.status == 400:
            error_data = await response.json()
            raise ExampleError(
                error="Validation error",
                status=response.status,
                data=error_data,
            )
        elif response.status == 500:
            error_data = await response.json()
            raise ExampleError(
                error="Internal server error",
                status=response.status,
                data=error_data,
            )
        else:
            raise ExampleError(
                error=f"Unexpected status code: {response.status}",
                status=response.status,
            )

    # GET /v1/liveness
    # Tags: liveness
    async def get_liveness(self) -> "V1LivenessResponseBody":
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

    # POST /v1/ratelimit.commitLease
    # Tags: ratelimit
    async def ratelimit_commit_lease(self, lease: str, cost: int) -> None:
        """
        Commit a rate limit lease.
        
        Args:
            lease: The lease to commit
            cost: The actual cost of the request
            
        Raises:
            ExampleError: If the API returns an error
        """
        body = {
            "lease": lease,
            "cost": cost
        }
        
        response = await self.fetch(
            method="POST",
            path="/v1/ratelimit.commitLease",
            body=body
        )
        
        if response.status == 204:
            return
        elif response.status == 400:
            error_data = await response.json()
            raise ExampleError(
                error="Bad Request",
                status=400,
                data=error_data
            )
        elif response.status == 500:
            error_data = await response.json()
            raise ExampleError(
                error="Internal Server Error",
                status=500,
                data=error_data
            )
        else:
            raise ExampleError(
                error=f"Unexpected status code: {response.status}",
                status=response.status
            )

    # POST /vault.v1.VaultService/Decrypt
    # Tags: vault
    async def vault_decrypt(
        self, 
        keyring: str, 
        encrypted: str
    ) -> str:
        """
        Decrypt an encrypted value using the specified keyring.

        Args:
            keyring: The keyring to use for decryption
            encrypted: The encrypted base64 string

        Returns:
            The decrypted plaintext value

        Raises:
            ExampleError: If the request fails or returns an error
        """
        body = {
            "keyring": keyring,
            "encrypted": encrypted
        }
        
        response = await self.fetch(
            method="POST",
            path="/vault.v1.VaultService/Decrypt",
            body=body
        )
        
        if response.status == 200:
            data = await response.json()
            return data["plaintext"]
        elif response.status in (400, 500):
            error_data = await response.json()
            raise ExampleError(
                error=error_data.get("detail", "Decryption failed"),
                status=response.status,
                data=error_data
            )
        else:
            raise ExampleError(
                error=f"Unexpected status code: {response.status}",
                status=response.status
            )

    # POST /vault.v1.VaultService/Encrypt
    # Tags: vault
    async def vault_encrypt(
        self, 
        data: str, 
        keyring: str
    ) -> Dict[str, str]:
        """
        Encrypt data using the specified keyring.

        Args:
            data: The data to encrypt
            keyring: The keyring to use for encryption

        Returns:
            Dictionary containing encrypted data and keyId

        Raises:
            ExampleError: If the request fails
        """
        body = {
            "data": data,
            "keyring": keyring
        }
        
        response = await self.fetch(
            method="POST",
            path="/vault.v1.VaultService/Encrypt",
            body=body
        )
        
        if response.status == 200:
            return await response.json()
        elif response.status in (400, 500):
            error_data = await response.json()
            raise ExampleError(
                error=error_data.get("detail", "Encryption failed"),
                status=response.status,
                data=error_data
            )
        else:
            raise ExampleError(
                error=f"Unexpected status code: {response.status}",
                status=response.status
            )

    # POST /vault.v1.VaultService/EncryptBulk
    # Tags: vault
    async def vault_encrypt_bulk(
        self,
        data: list[str],
        keyring: str,
    ) -> list[dict[str, str]]:
        """
        Encrypt multiple pieces of data in bulk.

        Args:
            data: List of strings to encrypt
            keyring: The keyring to use for encryption

        Returns:
            List of encrypted objects containing 'encrypted' and 'keyId' fields

        Raises:
            ExampleError: If the request fails
        """
        body = {
            "data": data,
            "keyring": keyring,
        }

        response = await self.fetch(
            method="POST",
            path="/vault.v1.VaultService/EncryptBulk",
            body=body,
        )

        if response.status != 200:
            error_data = await response.json()
            raise ExampleError(
                error=error_data.get("detail", "Unknown error"),
                status=response.status,
                data=error_data,
            )

        response_data = await response.json()
        return response_data["encrypted"]


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


class Item(TypedDict):
    identifier: str
    limit: int
    duration: int
    cost: NotRequired[int]


class SingleRatelimitResponse(TypedDict):
    current: int
    limit: int
    remaining: int
    reset: int
    success: bool


class V1RatelimitMultiRatelimitResponseBody(TypedDict):
    ratelimits: list[SingleRatelimitResponse]


class Lease(TypedDict):
    cost: int
    timeout: int


class V1RatelimitRatelimitResponseBody(TypedDict):
    current: int
    lease: Optional[str]
    limit: int
    remaining: int
    reset: int
    success: bool


class V1LivenessResponseBody:
    def __init__(self, message: str):
        self.message = message

    @classmethod
    def from_dict(cls, data: dict) -> "V1LivenessResponseBody":
        return cls(message=data["message"])








