#!/bin/bash
# Entrypoint: run Alembic migrations, then start the API server.
#
# Running migrations on startup is fine for a single-instance deployment.
# If you ever scale to multiple replicas, move migrations to a Railway
# "release command" or a separate one-shot service so they don't race.

set -e

echo "==> Running database migrations"
alembic upgrade head

echo "==> Starting API server on port ${PORT:-8000}"
# --proxy-headers so we trust X-Forwarded-* from Railway's edge router
# --forwarded-allow-ips='*' because Railway's proxy IPs aren't stable
exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port "${PORT:-8000}" \
    --proxy-headers \
    --forwarded-allow-ips='*'
