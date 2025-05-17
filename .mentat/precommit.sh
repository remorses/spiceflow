#!/bin/bash

# Go to repository root
cd "$(dirname "$0")/.."

# Define function to check specifically for rootDir errors
# This is the specific error type that caused CI failures
check_rootdir_errors() {
  if [ -f "spiceflow/tsconfig.json" ]; then
    echo "Checking for rootDir configuration issues..."
    
    # Verify 'include' pattern in tsconfig.json
    if grep -q '"include": \["src", "tests"\]' spiceflow/tsconfig.json; then
      echo "❌ Error: tsconfig.json includes 'tests' directory but rootDir is 'src'"
      echo "    This will cause TypeScript build errors."
      echo "    Fix: Remove 'tests' from the include array in tsconfig.json"
      echo "    Current: \"include\": [\"src\", \"tests\"]"
      echo "    Should be: \"include\": [\"src\"]"
      echo ""
      echo "    Use tsconfig.test.json for type checking tests separately"
      exit 1
    fi
  fi
  
  # Check if any test files incorrectly match patterns in rootDir
  if [ -d "spiceflow/tests" ] && [ -d "spiceflow/src" ]; then
    echo "Validating tests directory is not under rootDir..."
    
    # Simple check to ensure 'tests' directory is separate from 'src'
    # This catches the most common rootDir configuration issues
    if find spiceflow/tsconfig.json -type f -exec grep -l '"rootDir": "src"' {} \; | grep -q .; then
      if [ ! -f "spiceflow/tsconfig.test.json" ]; then
        echo "⚠️ Warning: No tsconfig.test.json found for test files"
        echo "    Consider creating a separate tsconfig for tests"
      fi
    fi
  fi
  
  return 0
}

# Run checks
check_rootdir_errors

echo "✓ No TypeScript configuration errors detected"
