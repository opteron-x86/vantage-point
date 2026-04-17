# Vantage Point

A personal trading research assistant that collects market data and news, uses AI (Claude via Anthropic or OpenRouter) to analyze your watchlist, and surfaces setups worth reviewing. Single-user, locally deployable or Railway-deployable, with a dark-mode web dashboard.

## Architecture

- **Backend:** Python 3.12 + FastAPI, PostgreSQL, SQLAlchemy + Alembic, Anthropic/OpenRouter SDKs
- **Frontend:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind + TanStack Query + lightweight-charts
- **Auth:** Single-user JWT (bcrypt-hashed password)
- **Theme:** Nord (dark)

## Layout

```
backend/   FastAPI app, services, DB models, AI integration, scripts, Dockerfile
frontend/  Next.js app with feature-grouped components, Dockerfile
RAILWAY.md Step-by-step deployment walkthrough
```

See [backend/README.md](backend/README.md) and [frontend/README.md](frontend/README.md) for per-subsystem details.

## Run locally

1. Copy `.env.example` to `.env` and fill in keys (Alpaca, Finnhub, Anthropic and/or OpenRouter)
2. Start Postgres: `docker compose up -d`
3. Bootstrap the backend:
   ```bash
   cd backend
   uv sync          # or: pip install -e .
   alembic upgrade head
   python -m scripts.create_user
   uvicorn app.main:app --reload
   ```
4. Bootstrap the frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
5. Open http://localhost:3000 and log in.

## Deploy to Railway

See **[RAILWAY.md](RAILWAY.md)** for the full walkthrough. Summary:

1. Push the repo to GitHub.
2. Create a Railway project. Add Postgres.
3. Add a `backend` service (root directory: `backend`) — Railway auto-detects the Dockerfile.
4. Add a `frontend` service (root directory: `frontend`) with `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` as build variables pointing at the backend.
5. Bind `DATABASE_URL=${{Postgres.DATABASE_URL}}` and other env vars on the backend.
6. Generate public domains, wire `CORS_ORIGINS` on the backend to the frontend's URL.
7. Create your user: `railway run python -m scripts.create_user` (backend service).

## Disclaimer

This is a personal research tool. It does not provide financial advice. No trades are placed by the system. You are responsible for your own decisions.
