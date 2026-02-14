# Task 5.4: Implement Flat File Storage Backend

> **Epic:** Meridian Tracker (Python)
> **Type:** Feature
> **Priority:** Medium
> **Effort:** Medium (1-3 days)
> **Dependencies:** 5.2
> **Status:** Pending

## Goal
Implement an alternative JSON-based flat file storage backend for the Meridian Tracker. This provides the simplest possible setup — human-readable files, no database.

## Background
Some users may prefer flat file storage for its simplicity: files are human-readable, version-controllable (store issues in git), and require zero setup. Each entity type gets a directory, each entity gets a JSON file. The flat file backend implements the same storage interface as the SQLite backend — swappable via configuration.

## Acceptance Criteria
- [ ] Implements the same storage interfaces as the SQLite backend
- [ ] Issues stored as individual JSON files in a configurable directory
- [ ] Projects stored as individual JSON files
- [ ] Comments stored as JSON files within issue subdirectories
- [ ] CRUD operations: create, get, update, delete, list with filters
- [ ] Filtering and pagination work the same as SQLite backend
- [ ] File path configurable via `TRACKER_FILES_PATH` environment variable
- [ ] Storage selection via `TRACKER_STORAGE=flatfile` environment variable
- [ ] Files are human-readable (pretty-printed JSON)

## Subtasks
- [ ] Design file/directory structure (e.g., `data/issues/001.json`, `data/projects/001.json`)
- [ ] Implement file-based issue storage (read/write JSON files)
- [ ] Implement file-based project storage
- [ ] Implement file-based comment storage
- [ ] Implement ID generation (auto-increment or UUID)
- [ ] Implement filtering by loading and filtering in-memory
- [ ] Implement pagination over file-based listing
- [ ] Handle concurrent access (file locking or atomic writes)
- [ ] Write tests for all CRUD operations
- [ ] Run the same test suite as SQLite backend (via shared interface)

## Notes
- Flat file storage is intentionally simple — it loads all entities into memory for queries. This is fine for small to medium projects (hundreds of issues, not millions)
- File naming: consider using slugified titles or UUIDs for filenames
- Pretty-printed JSON with sorted keys makes files diff-friendly for version control
- Concurrent access: use atomic writes (write to temp file, then rename) to prevent corruption
- The same test suite should run against both SQLite and flat file backends — parameterized tests
