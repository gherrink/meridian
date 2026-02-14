# FastAPI Patterns — Tracker

## Overview

The Tracker uses FastAPI for its REST API. Endpoints follow RESTful conventions with dependency injection for services and database sessions.

## App Factory

```python
# src/tracker/main.py
from fastapi import FastAPI

from tracker.api.routes import issues, projects, health


def create_app() -> FastAPI:
    app = FastAPI(
        title="Meridian Tracker",
        version="0.1.0",
        description="Lightweight local issue tracker for Meridian",
    )

    app.include_router(health.router, tags=["health"])
    app.include_router(issues.router, prefix="/api/v1", tags=["issues"])
    app.include_router(projects.router, prefix="/api/v1", tags=["projects"])

    return app
```

## Route Pattern

```python
# src/tracker/api/routes/issues.py
from fastapi import APIRouter, Depends, HTTPException, status

from tracker.api.deps import get_issue_service
from tracker.schemas.issue import IssueCreate, IssueResponse, IssueUpdate
from tracker.services.issue_service import IssueService

router = APIRouter()


@router.get("/issues", response_model=list[IssueResponse])
async def list_issues(
    status_filter: str | None = None,
    service: IssueService = Depends(get_issue_service),
) -> list[IssueResponse]:
    return await service.list_issues(status_filter=status_filter)


@router.get("/issues/{issue_id}", response_model=IssueResponse)
async def get_issue(
    issue_id: str,
    service: IssueService = Depends(get_issue_service),
) -> IssueResponse:
    issue = await service.get_issue(issue_id)
    if issue is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")
    return issue


@router.post("/issues", response_model=IssueResponse, status_code=status.HTTP_201_CREATED)
async def create_issue(
    payload: IssueCreate,
    service: IssueService = Depends(get_issue_service),
) -> IssueResponse:
    return await service.create_issue(payload)


@router.patch("/issues/{issue_id}", response_model=IssueResponse)
async def update_issue(
    issue_id: str,
    payload: IssueUpdate,
    service: IssueService = Depends(get_issue_service),
) -> IssueResponse:
    issue = await service.update_issue(issue_id, payload)
    if issue is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Issue not found")
    return issue
```

## Dependency Injection

```python
# src/tracker/api/deps.py
from functools import lru_cache

from tracker.services.issue_service import IssueService
from tracker.storage.sqlite import SQLiteStorage


@lru_cache
def get_storage() -> SQLiteStorage:
    return SQLiteStorage()


def get_issue_service(
    storage: SQLiteStorage = Depends(get_storage),
) -> IssueService:
    return IssueService(storage=storage)
```

## Conventions

- One router per resource in `api/routes/`
- Use `Depends()` for dependency injection, never construct services in endpoints
- Return Pydantic response models, not raw dictionaries
- Use `HTTPException` for error responses with appropriate status codes
- Use `status.HTTP_*` constants, not raw integers
- All endpoints are async
- Prefix API routes with `/api/v1`
- Use path parameters for resource IDs, query parameters for filters
