---
name: python-guide
description: Python conventions and patterns for the Meridian Tracker (FastAPI, SQLModel, pytest). Used by developer and test-writer agents when working on tracker/* code. Contains references for FastAPI endpoints, SQLModel schemas, and testing.
---

# Python Guide — Tracker

Conventions for all Python code in `tracker/`. Follow these when writing or reviewing code.

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
- **Naming**: snake_case functions/variables, PascalCase classes
- **Imports**: Sorted by Ruff (isort-compatible)
- **Async**: async/await for I/O-bound operations (endpoints, DB queries)
- **Config**: Pydantic Settings, loaded from environment variables

## Patterns

- **API**: See `references/fastapi-patterns.md`
- **Data**: See `references/sqlmodel-patterns.md`

## Testing

See `references/testing-patterns.md` for detailed patterns.

- **Framework**: pytest with async support (anyio)
- **Location**: `tests/` directory at project root
- **Naming**: `test_[name].py`, functions `test_[description]`
- **Fixtures**: Shared fixtures in `conftest.py`
- **HTTP**: httpx AsyncClient with FastAPI TestClient
