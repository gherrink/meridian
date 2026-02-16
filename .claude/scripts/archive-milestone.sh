#!/usr/bin/env bash
# Archive work-history directories into a timestamped zip under .claude/milestones/.
# Preserves .gitkeep files. Only deletes originals after verifying the zip.
# Usage: .claude/scripts/archive-milestone.sh

set -euo pipefail

HISTORY_DIR=".claude/work-history"
MILESTONES_DIR=".claude/milestones"

# Find directories to archive (exclude .gitkeep)
mapfile -t DIRS < <(find "$HISTORY_DIR" -mindepth 1 -maxdepth 1 -type d | sort)

if [ ${#DIRS[@]} -eq 0 ]; then
  echo "No work-history directories to archive."
  exit 1
fi

DIR_COUNT=${#DIRS[@]}
TIMESTAMP=$(date "+%Y%m%d-%H%M%S")
ZIP_FILE="$MILESTONES_DIR/${TIMESTAMP}.zip"

mkdir -p "$MILESTONES_DIR"

# Create the zip from inside work-history to get clean relative paths
(cd "$HISTORY_DIR" && zip -r "../milestones/${TIMESTAMP}.zip" . -x ".gitkeep")

# Verify the zip is non-empty
if [ ! -s "$ZIP_FILE" ]; then
  echo "ERROR: Archive zip is empty or missing: $ZIP_FILE"
  exit 1
fi

# Delete archived directories (preserve .gitkeep)
for dir in "${DIRS[@]}"; do
  rm -rf "$dir"
done

echo "Archived $DIR_COUNT directories to $ZIP_FILE"
echo "Work-history cleaned up (.gitkeep preserved)."
