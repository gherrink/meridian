#!/usr/bin/env bash
# Test runner wrapper — captures full output to a log file and prints only a compact summary.
# Usage: .claude/scripts/run-tests.sh <command> [args...]
# Example: .claude/scripts/run-tests.sh pnpm --filter @meridian/core test

set -euo pipefail

if [ $# -eq 0 ]; then
  echo "Usage: $0 <command> [args...]"
  exit 1
fi

WORK_DIR=".claude/work"
LOG_FILE="$WORK_DIR/test-output.log"

mkdir -p "$WORK_DIR"

# Run the test command, capturing all output
"$@" > "$LOG_FILE" 2>&1
EXIT_CODE=$?

# Print compact summary
TOTAL_LINES=$(wc -l < "$LOG_FILE")
echo "--- Test Summary ---"
echo "Command: $*"
echo "Exit code: $EXIT_CODE"
echo "Full output: $LOG_FILE ($TOTAL_LINES lines)"
echo ""
echo "Last 5 lines:"
tail -n 5 "$LOG_FILE"

exit $EXIT_CODE
