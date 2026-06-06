// Next.js config for the federation consumer example.
// Transpiles spiceflow so webpack can bundle the federation-client code.
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['spiceflow'],
}

export default nextConfig
