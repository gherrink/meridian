#!/bin/bash
# Auto-fix lint issues after Write/Edit so the agent doesn't waste turns on formatting.
# Runs the appropriate fixer based on file path and extension.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path')

PROJECT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"

# TypeScript files in packages/
if [[ "$FILE_PATH" == "$PROJECT_DIR"/packages/*.ts ]]; then
  npx eslint --fix "$FILE_PATH" 2>/dev/null
  exit 0
fi

# Go files in cli/
if [[ "$FILE_PATH" == "$PROJECT_DIR"/cli/*.go ]]; then
  gofmt -w "$FILE_PATH" 2>/dev/null
  exit 0
fi

# Python files in tracker/
if [[ "$FILE_PATH" == "$PROJECT_DIR"/tracker/*.py ]]; then
  cd "$PROJECT_DIR/tracker"
  ruff check --fix "$FILE_PATH" 2>/dev/null
  ruff format "$FILE_PATH" 2>/dev/null
  exit 0
fi
