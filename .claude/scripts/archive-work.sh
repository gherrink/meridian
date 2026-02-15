#!/bin/bash
# archive-work.sh — Moves .claude/work/ artifacts to work-history/ after orchestration.
# Triggered by the Stop hook. Exits silently if no work files exist or if the
# orchestrator lock (.claude/work/.lock) is present (orchestration still in progress).

set -euo pipefail

WORK_DIR="${CLAUDE_PROJECT_DIR:-.}/.claude/work"
HISTORY_DIR="${CLAUDE_PROJECT_DIR:-.}/.claude/work-history"

# Check if work directory has .md files
shopt -s nullglob
md_files=("$WORK_DIR"/*.md)
shopt -u nullglob

if [ ${#md_files[@]} -eq 0 ]; then
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

# Move all .md files
for f in "${md_files[@]}"; do
  mv "$f" "$target_dir/"
done

exit 0
