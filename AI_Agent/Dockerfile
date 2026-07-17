# ---- Stage 1: Build React frontend ----
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci --ignore-scripts 2>/dev/null || npm install
COPY frontend/ ./
RUN npm run build
RUN test -f /app/static_build/index.html

# ---- Stage 2: API + agent (pure Debian, no Kali / pentest tool suite) ----
FROM debian:bookworm-slim

ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /hackract
EXPOSE 8008

# Minimal OS deps: Python stack, curl (healthcheck), build tools for pip wheels, Node (agent JS execution)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    python-is-python3 \
    build-essential \
    nodejs \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /tmp/requirements.txt
RUN pip3 install --no-cache-dir --break-system-packages -r /tmp/requirements.txt && \
    rm /tmp/requirements.txt

COPY . /hackract/

COPY --from=frontend-builder /app/static_build/ /hackract/static_build/

RUN mkdir -p /hackract/memory /hackract/logs /hackract/work_dir

RUN chmod +x /hackract/run_cli.py
RUN chmod +x /hackract/instruments/*/*.sh 2>/dev/null || true

# Optional helper if you later apt-install something inside the container
RUN printf '%s\n' '#!/bin/sh' 'set -e' 'apt-get install -y "$@"' > /usr/local/bin/install-tool && \
    chmod +x /usr/local/bin/install-tool

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8008/api/health || exit 1

CMD ["python3", "run_api.py"]
