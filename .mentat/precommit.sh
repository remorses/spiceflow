#!/bin/bash
set -e

cd "$(dirname "$0")/.."  # Go to repository root

# Find a working package manager or use npx
if command -v pnpm &> /dev/null; then
    PACKAGE_MANAGER="pnpm"
elif command -v yarn &> /dev/null; then
    PACKAGE_MANAGER="yarn"
elif command -v npm &> /dev/null; then
    PACKAGE_MANAGER="npm"
else
    PACKAGE_MANAGER="npx"
fi

echo "Using package manager: $PACKAGE_MANAGER"

# Ensure we're in the spiceflow directory
cd spiceflow

# Check TypeScript presence
TS_BIN="./node_modules/.bin/tsc"
if [ ! -f "$TS_BIN" ]; then
    echo "TypeScript not found in node_modules. Installing..."
    if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
        pnpm install --dev typescript
    elif [ "$PACKAGE_MANAGER" = "yarn" ]; then
        yarn add --dev typescript
    elif [ "$PACKAGE_MANAGER" = "npm" ]; then
        npm install --save-dev typescript
    else
        echo "Using global TypeScript with npx..."
    fi
fi

# Make sure TypeScript builds without errors (only checks, doesn't emit files)
echo "Checking main source files..."
if [ -f "$TS_BIN" ]; then
    $TS_BIN --noEmit
    echo "Checking test files..."
    $TS_BIN --noEmit -p tsconfig.test.json
elif [ "$PACKAGE_MANAGER" = "npx" ]; then
    npx tsc --noEmit
    echo "Checking test files..."
    npx tsc --noEmit -p tsconfig.test.json
else
    $PACKAGE_MANAGER exec tsc --noEmit
    echo "Checking test files..."
    $PACKAGE_MANAGER exec tsc --noEmit -p tsconfig.test.json
fi

echo "✓ TypeScript checks passed!"
