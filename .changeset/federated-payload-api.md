---
'spiceflow': patch
---

Add generic federated Flight payload APIs with `encodeFederationPayload(...)`, `RenderFederatedPayload`, and `decodeFederationPayload(response)` so routes can return plain objects, JSX, or objects containing JSX over the same federation wire format. This also updates the federation examples to fetch responses explicitly before rendering them and keeps same-app flows working with `app.handle(new Request(...))`.
