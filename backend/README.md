# Backend

FastAPI application for Vantage Point.

## Layout

```
app/
├── main.py          FastAPI entry point, middleware, route registration
├── config.py        Settings (loaded from .env via pydantic-settings)
├── api/             HTTP route handlers (thin — delegate to services)
├── services/        Business logic (market data, news, briefing, chat)
├── ai/              AI provider clients, tool schemas, logged wrapper
├── db/              SQLAlchemy models, session factory, Alembic migrations
├── schemas/         Pydantic request/response models
├── auth/            Password hashing + JWT
└── scheduler/       APScheduler jobs (daily briefing, data refresh)

scripts/             One-off CLI utilities
tests/               Pytest suite
```

## Setup

From the project root, with Postgres running (`docker compose up -d`):

```bash
cd backend
uv sync                          # or: pip install -e ".[dev]"
alembic upgrade head             # create DB schema
python -m scripts.create_user    # bootstrap first user
uvicorn app.main:app --reload
```

Swagger UI: http://localhost:8000/docs

## Common commands

```bash
alembic revision --autogenerate -m "describe change"   # new migration
alembic upgrade head                                    # apply migrations
alembic downgrade -1                                    # roll back one

python -m scripts.fetch_data                            # manual data refresh
python -m scripts.score_news                            # manual relevance scoring

ruff check . --fix                                      # lint
ruff format .                                           # format
pytest                                                  # tests
```
