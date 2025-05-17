#!/bin/bash
set -e

# Make sure TypeScript builds without errors (only checks, doesn't emit files)
cd spiceflow && pnpm tsc --noEmit

# Make sure tests type-check properly
cd spiceflow && pnpm tsc --noEmit -p tsconfig.test.json

echo "✓ TypeScript checks passed!"
