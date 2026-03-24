// Server-only module for e2e testing the .server.ts file guard.
// Importing this from client code should produce a compile error.
export const secret = "server-only-value"
