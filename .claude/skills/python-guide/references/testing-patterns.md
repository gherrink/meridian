# Testing Patterns — Tracker (Python)

## Overview

The Tracker uses pytest with async support for testing. Tests use httpx AsyncClient for API testing and an in-memory SQLite database for storage tests.

## Running Tests

```bash
# All tests
pytest

# Specific file
pytest tests/test_issues.py

# Verbose
pytest -v

# With coverage
pytest --cov=tracker

# Specific test
pytest tests/test_issues.py::test_create_issue
```

## Configuration

```toml
# pyproject.toml
[tool.pytest.ini_options]
testpaths = [ "tests" ]
asyncio_mode = "auto"
```

## Fixtures

```python
# tests/conftest.py
import pytest
from httpx import ASGITransport, AsyncClient
from sqlmodel import SQLModel, Session, create_engine

from tracker.main import create_app
from tracker.api.deps import get_storage
from tracker.storage.sqlite import SQLiteStorage

@pytest.fixture
def engine():
    """Create an in-memory database for testing."""
    engine = create_engine("sqlite://", echo=False)
    SQLModel.metadata.create_all(engine)
    yield engine
    SQLModel.metadata.drop_all(engine)

@pytest.fixture
def storage(engine):
    """Create a storage backend with test database."""
    return SQLiteStorage(engine=engine)

@pytest.fixture
async def client(storage):
    """Create a test HTTP client."""
    app = create_app()
    app.dependency_overrides[get_storage] = lambda: storage

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        yield client
```

## Patterns

### API endpoint tests

```python
# tests/test_issues.py
import pytest

async def test_create_issue(client):
    # Arrange
    payload = {
        "title": "Test issue",
        "description": "A test",
        "priority": "high",
        "project_id": "proj-1",
    }

    # Act
    response = await client.post("/api/v1/issues", json=payload)

    # Assert
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test issue"
    assert data["priority"] == "high"
    assert data["status"] == "open"
    assert "id" in data

async def test_get_issue_not_found(client):
    response = await client.get("/api/v1/issues/nonexistent")
    assert response.status_code == 404

async def test_list_issues_with_filter(client):
    # Arrange — create issues with different statuses
    await client.post("/api/v1/issues", json={
        "title": "Open issue", "project_id": "proj-1",
    })
    await client.post("/api/v1/issues", json={
        "title": "Closed issue", "project_id": "proj-1",
    })
    # Close the second one
    issues = (await client.get("/api/v1/issues")).json()
    await client.patch(f"/api/v1/issues/{issues[1]['id']}", json={"status": "closed"})

    # Act
    response = await client.get("/api/v1/issues", params={"status_filter": "open"})

    # Assert
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "Open issue"
```

### Service unit tests

```python
# tests/test_issue_service.py
from unittest.mock import AsyncMock

import pytest

from tracker.services.issue_service import IssueService
from tracker.schemas.issue import IssueCreate

async def test_create_issue_calls_storage():
    # Arrange
    mock_storage = AsyncMock()
    mock_storage.create_issue.return_value = {"id": "1", "title": "Test"}
    service = IssueService(storage=mock_storage)

    # Act
    await service.create_issue(IssueCreate(title="Test", project_id="proj-1"))

    # Assert
    mock_storage.create_issue.assert_called_once()
```

### Storage tests

```python
# tests/test_storage.py
async def test_sqlite_create_and_retrieve(storage):
    # Arrange
    from tracker.models.issue import Issue
    issue = Issue(title="Test", project_id="proj-1")

    # Act
    created = await storage.create_issue(issue)
    retrieved = await storage.get_issue(created.id)

    # Assert
    assert retrieved is not None
    assert retrieved.title == "Test"
    assert retrieved.id == created.id
```

## Conventions

- Test files: `test_[name].py` in `tests/`
- Test functions: `test_[description]` (no class wrappers)
- Use `conftest.py` for shared fixtures
- In-memory SQLite for database tests (fast, isolated)
- httpx AsyncClient for API tests (real HTTP, async-native)
- `AsyncMock` for mocking async dependencies
- One assertion focus per test (but multiple `assert` statements are fine for checking one outcome)
- No test data in source code — define in fixtures or test functions
