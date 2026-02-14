---
name: python-guide
description: Python conventions and patterns for the Meridian Tracker (FastAPI, SQLModel, pytest). Used by developer and test-writer agents when working on tracker/* code. Contains references for FastAPI endpoints, SQLModel schemas, and testing.
---

# Python Guide — Tracker

This guide defines the conventions for all Python code in the Meridian Tracker (`tracker/`). Agents must follow these patterns when writing or reviewing Python code.

## Project Setup

- **Language**: Python 3.12+
- **Package manager**: uv (or pip with pyproject.toml)
- **Framework**: FastAPI
- **ORM**: SQLModel (SQLAlchemy + Pydantic)
- **Testing**: pytest
- **Linting**: Ruff
- **Type checking**: mypy (strict mode)

## Directory Structure

```
tracker/
  src/
    tracker/
      __init__.py
      main.py              # FastAPI app factory
      api/
        __init__.py
        routes/
          issues.py        # Issue endpoints
          projects.py      # Project endpoints
          health.py        # Health check
        deps.py            # Dependency injection
      models/
        __init__.py
        issue.py           # SQLModel models
        project.py
      schemas/
        __init__.py
        issue.py           # Pydantic request/response schemas
        project.py
      storage/
        __init__.py
        sqlite.py          # SQLite backend
        base.py            # Abstract storage interface
      services/
        __init__.py
        issue_service.py   # Business logic
  tests/
    conftest.py            # Shared fixtures
    test_issues.py
    test_projects.py
  pyproject.toml
```

## Key Libraries

| Library | Purpose |
|---------|---------|
| FastAPI | Web framework |
| SQLModel | ORM (SQLAlchemy + Pydantic) |
| Uvicorn | ASGI server |
| pytest | Testing |
| httpx | Async HTTP client for testing |
| Ruff | Linting and formatting |

## Coding Conventions

- **Type hints**: Required on all function signatures
- **Docstrings**: Google style for public functions
- **Naming**: snake_case for functions/variables, PascalCase for classes
- **Imports**: Sorted by Ruff (isort-compatible)
- **Async**: Use async/await for I/O-bound operations (FastAPI endpoints, DB queries)
- **Config**: Pydantic Settings for configuration, loaded from environment variables

## API Patterns

See `references/fastapi-patterns.md` for detailed FastAPI patterns.

## Data Patterns

See `references/sqlmodel-patterns.md` for detailed SQLModel patterns.

## Testing

See `references/testing-patterns.md` for detailed testing patterns.

- **Framework**: pytest with async support (anyio)
- **Location**: `tests/` directory at project root
- **Naming**: `test_[name].py`, functions `test_[description]`
- **Fixtures**: Shared fixtures in `conftest.py`
- **HTTP**: httpx AsyncClient with FastAPI TestClient
