// Default SSR bridge (non-RSC environments).
// Returns null — SSR rendering is handled externally by entry.ssr.tsx.
// Typed as function | null so spiceflow.tsx can check and call it in RSC env
// where the react-server condition resolves to the real implementation.
export const renderSsr: ((flightResponse: Response, request: Request) => Promise<Response>) | null = null
