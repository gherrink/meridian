#!/bin/bash
# archive-work.sh — Moves .claude/work/ artifacts to work-history/ after orchestration.
# Triggered by the Stop hook. Exits silently if no work files exist or if the
# orchestrator lock (.claude/work/.lock) is present (orchestration still in progress).
# Handles all file types (md, log, json, etc.), not just markdown.

set -euo pipefail

WORK_DIR="${CLAUDE_PROJECT_DIR:-.}/.claude/work"
HISTORY_DIR="${CLAUDE_PROJECT_DIR:-.}/.claude/work-history"

# Check if work directory has any files (excluding .lock)
shopt -s nullglob
work_files=("$WORK_DIR"/*)
shopt -u nullglob

# Filter out .lock and directories
archivable=()
for f in "${work_files[@]}"; do
  [ -f "$f" ] && [ "$(basename "$f")" != ".lock" ] && archivable+=("$f")
done

if [ ${#archivable[@]} -eq 0 ]; then
  exit 0
fi

# If orchestration is still in progress, skip archiving
if [ -f "$WORK_DIR/.lock" ]; then
  exit 0
fi

# Extract task name from context.md or blueprint.md first heading
task_name=""
for source_file in "$WORK_DIR/context.md" "$WORK_DIR/blueprint.md"; do
  if [ -f "$source_file" ] && [ -z "$task_name" ]; then
    task_name=$(head -10 "$source_file" \
      | grep -m1 '^#' \
      | sed 's/^#* *//' \
      | tr '[:upper:]' '[:lower:]' \
      | sed 's/[^a-z0-9]/-/g; s/--*/-/g; s/^-//; s/-$//' \
      | cut -c1-50)
  fi
done

# Fallback if no heading found
if [ -z "$task_name" ]; then
  task_name="task"
fi

# Create timestamped archive directory
timestamp=$(date +%Y%m%d-%H%M%S)
target_dir="$HISTORY_DIR/${timestamp}-${task_name}"
mkdir -p "$target_dir"

# Move all archivable files
for f in "${archivable[@]}"; do
  mv "$f" "$target_dir/"
done

exit 0
