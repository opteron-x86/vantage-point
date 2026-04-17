# syntax=docker/dockerfile:1.7

# ---- Builder ---------------------------------------------------------------
FROM python:3.12-slim AS builder

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# psycopg[binary] ships its own libpq, so we only need build-essential for
# any other packages with C extensions.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies first (leverages Docker layer cache)
COPY pyproject.toml ./
RUN pip install --prefix=/install .

# ---- Runtime ---------------------------------------------------------------
FROM python:3.12-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/install/bin:${PATH}"

WORKDIR /app

# Runtime system deps (just curl for the healthcheck; psycopg[binary] bundles libpq)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed Python packages from the builder
COPY --from=builder /install /install

# Copy application code
COPY app ./app
COPY alembic.ini ./
COPY scripts ./scripts
COPY entrypoint.sh ./
RUN chmod +x ./entrypoint.sh

# Non-root user for safety
RUN useradd --create-home --uid 1000 app && chown -R app:app /app
USER app

# Railway injects $PORT; default to 8000 for local docker run
ENV PORT=8000
EXPOSE 8000

# Basic healthcheck so Railway can tell when the service is ready.
# Note: Railway also does its own HTTP probe; this is belt-and-suspenders.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS "http://localhost:${PORT}/health" || exit 1

CMD ["./entrypoint.sh"]
