// Public API for standalone federation consumers (non-Vite-RSC apps).
// This is the entry point for the "spiceflow/federation-client" subpath.
// Only re-exports the functions that are part of the public API.
export {
  decodeFederationPayload,
  decodeFederationPayloadDetails,
  setupFederationConsumer,
} from './federated-payload.ts'
