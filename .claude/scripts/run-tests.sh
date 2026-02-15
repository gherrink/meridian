#!/usr/bin/env bash
# Test runner wrapper — captures full output to a log file and prints only a compact summary.
# When tests fail, detects the test runner and extracts error sections into a separate file.
# Usage: .claude/scripts/run-tests.sh <command> [args...]
# Example: .claude/scripts/run-tests.sh pnpm --filter @meridian/core test

set -euo pipefail

if [ $# -eq 0 ]; then
  echo "Usage: $0 <command> [args...]"
  exit 1
fi

WORK_DIR=".claude/work"
LOG_FILE="$WORK_DIR/test-output.log"
ERRORS_FILE="$WORK_DIR/test-errors.log"
CLEAN_LOG="$WORK_DIR/.test-output-clean.log"

mkdir -p "$WORK_DIR"

# Clean up previous errors file
rm -f "$ERRORS_FILE"

# Run the test command, capturing all output
set +e
"$@" > "$LOG_FILE" 2>&1
EXIT_CODE=$?
set -e

# Strip ANSI escape codes for reliable pattern matching
sed 's/\x1b\[[0-9;]*[a-zA-Z]//g' "$LOG_FILE" > "$CLEAN_LOG"

# Extract errors when tests fail
extract_vitest_errors() {
  awk '
    /Failed Tests/ { in_block=1 }
    in_block { print; if (/\[[0-9]+\/[0-9]+\]/) in_block=0; next }
    /Test Files.*failed/ { print; next }
    /Tests.*failed/ { print; next }
  ' "$CLEAN_LOG"
}

extract_pytest_errors() {
  awk '
    /^=+ FAILURES =+$/ { printing=1 }
    /^=+ ERRORS =+$/ { printing=1 }
    /^=+ short test summary info =+$/ { printing=1 }
    printing && /^=+/ && !/FAILURES|ERRORS|short test summary/ { printing=0; print; next }
    printing { print }
  ' "$CLEAN_LOG"
}

extract_go_test_errors() {
  awk '
    /^--- FAIL:/ { printing=1; print; next }
    printing && /^(--- |FAIL|ok |PASS)/ { printing=0 }
    printing { print }
    /^FAIL\t/ { print }
  ' "$CLEAN_LOG"
}

extract_fallback_errors() {
  grep -i -n 'error\|fail\|panic' "$CLEAN_LOG" || true
}

detect_and_extract() {
  if grep -qE 'vitest|Failed Tests|✓|×' "$CLEAN_LOG"; then
    extract_vitest_errors
  elif grep -qE '^=+ (FAILURES|ERRORS|passed|failed)|pytest|collecting' "$CLEAN_LOG"; then
    extract_pytest_errors
  elif grep -qE '^--- (FAIL|PASS):|^FAIL	|^ok 	' "$CLEAN_LOG"; then
    extract_go_test_errors
  else
    extract_fallback_errors
  fi
}

if [ "$EXIT_CODE" -ne 0 ]; then
  errors=$(detect_and_extract)
  if [ -n "$errors" ]; then
    echo "$errors" > "$ERRORS_FILE"
  fi
fi

# Clean up temp file
rm -f "$CLEAN_LOG"

# Print compact summary
TOTAL_LINES=$(wc -l < "$LOG_FILE")
echo "--- Test Summary ---"
echo "Command: $*"
echo "Exit code: $EXIT_CODE"
echo "Full output: $LOG_FILE ($TOTAL_LINES lines)"

if [ -f "$ERRORS_FILE" ]; then
  ERROR_LINES=$(wc -l < "$ERRORS_FILE")
  echo "Errors: $ERRORS_FILE ($ERROR_LINES lines)"
fi

echo ""
echo "Last 5 lines:"
tail -n 5 "$LOG_FILE"

exit $EXIT_CODE
