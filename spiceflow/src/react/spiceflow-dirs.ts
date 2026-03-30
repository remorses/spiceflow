// Fallback for non-RSC environments. Resolved via package.json #spiceflow-dirs
// import map under the "default" condition. Returns empty strings since the
// Vite virtual module is not available outside of Vite RSC builds.

export const publicDir = ''
export const distDir = ''
