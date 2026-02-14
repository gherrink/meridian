# SQLModel Patterns — Tracker

## Overview

The Tracker uses SQLModel (which combines SQLAlchemy and Pydantic) for database models and schemas. Models serve double duty as both database tables and Pydantic validation models.

## Model Definitions

```python
# src/tracker/models/issue.py
import uuid
from datetime import datetime

from sqlmodel import Field, SQLModel


class Issue(SQLModel, table=True):
    """Issue database model."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="")
    status: str = Field(default="open")
    priority: str = Field(default="medium")
    project_id: str = Field(foreign_key="project.id")
    assignee_id: str | None = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

## Request/Response Schemas

```python
# src/tracker/schemas/issue.py
from datetime import datetime

from pydantic import BaseModel, Field


class IssueCreate(BaseModel):
    """Schema for creating an issue."""

    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="")
    priority: str = Field(default="medium")
    project_id: str
    assignee_id: str | None = None


class IssueUpdate(BaseModel):
    """Schema for updating an issue."""

    title: str | None = None
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    assignee_id: str | None = None


class IssueResponse(BaseModel):
    """Schema for issue API responses."""

    id: str
    title: str
    description: str
    status: str
    priority: str
    project_id: str
    assignee_id: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
```

## Storage Pattern

```python
# src/tracker/storage/base.py
from abc import ABC, abstractmethod

from tracker.models.issue import Issue


class BaseStorage(ABC):
    """Abstract storage interface."""

    @abstractmethod
    async def get_issue(self, issue_id: str) -> Issue | None: ...

    @abstractmethod
    async def list_issues(self, status_filter: str | None = None) -> list[Issue]: ...

    @abstractmethod
    async def create_issue(self, issue: Issue) -> Issue: ...

    @abstractmethod
    async def update_issue(self, issue_id: str, data: dict) -> Issue | None: ...
```

```python
# src/tracker/storage/sqlite.py
from sqlmodel import Session, select, create_engine

from tracker.models.issue import Issue
from tracker.storage.base import BaseStorage


class SQLiteStorage(BaseStorage):
    def __init__(self, db_url: str = "sqlite:///meridian.db"):
        self.engine = create_engine(db_url)

    async def get_issue(self, issue_id: str) -> Issue | None:
        with Session(self.engine) as session:
            return session.get(Issue, issue_id)

    async def list_issues(self, status_filter: str | None = None) -> list[Issue]:
        with Session(self.engine) as session:
            statement = select(Issue)
            if status_filter:
                statement = statement.where(Issue.status == status_filter)
            return list(session.exec(statement).all())

    async def create_issue(self, issue: Issue) -> Issue:
        with Session(self.engine) as session:
            session.add(issue)
            session.commit()
            session.refresh(issue)
            return issue
```

## Conventions

- Database models in `models/` with `table=True`
- API schemas in `schemas/` as plain Pydantic models (no `table=True`)
- Separate create/update/response schemas (don't reuse the DB model for API)
- Storage interface in `storage/base.py`, implementations alongside
- Use `Field()` for validation constraints and defaults
- UUID strings for IDs (not integer auto-increment)
- Timestamps as `datetime` with UTC
- Use `model_config = {"from_attributes": True}` on response schemas for ORM compatibility
