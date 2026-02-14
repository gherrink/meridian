# Task 5.1: Set Up FastAPI Project Structure

> **Epic:** Meridian Tracker (Python)
> **Type:** Feature
> **Priority:** High
> **Effort:** Small (< 1 day)
> **Dependencies:** None
> **Status:** Pending

## Goal
Set up the Python project structure for the Meridian Tracker — a standalone lightweight issue tracker with FastAPI, SQLModel, and uv for dependency management.

## Background
The Meridian Tracker is an independent Python application that works without the Heart. It provides its own REST API and storage backends (SQLite, flat files). The Heart connects to it via an adapter, treating it like any other backend. The tracker lives in the `tracker/` directory at the repo root, separate from the TypeScript monorepo.

## Acceptance Criteria
- [ ] Python project initialized with `pyproject.toml` and uv
- [ ] FastAPI application scaffold with basic app setup
- [ ] SQLModel dependency installed and configured
- [ ] pytest configured for testing
- [ ] Project structure follows standard Python conventions (src layout)
- [ ] `uv run uvicorn src.main:app --reload` starts the application
- [ ] `uv run pytest` runs tests (even if no tests exist yet)
- [ ] Python 3.12+ specified as minimum version

## Subtasks
- [ ] Create `tracker/` directory with `pyproject.toml`
- [ ] Configure uv for dependency management
- [ ] Install core dependencies: FastAPI, SQLModel, uvicorn, pydantic
- [ ] Install dev dependencies: pytest, httpx (for testing)
- [ ] Create `src/` directory with `main.py` (FastAPI app), `__init__.py`
- [ ] Create directory stubs: `domain/`, `storage/`, `routes/`, `config.py`
- [ ] Add `GET /health` endpoint to verify app starts
- [ ] Configure pytest with `conftest.py`
- [ ] Verify development server starts and health endpoint responds

## Notes
- Use uv (not pip or poetry) for dependency management — it's fast and consistent with the project's tooling philosophy
- The src layout (`tracker/src/`) prevents import issues and is the Python packaging best practice
- FastAPI auto-generates OpenAPI docs at `/docs` (Swagger UI) and `/redoc` — this is useful for development and consumed by the Heart adapter
- This task has NO dependencies on the TypeScript monorepo — it can start immediately, even before Epic 1 is complete
