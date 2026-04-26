#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="${SCRIPT_DIR}/.."
cd "${PROJECT_ROOT}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required but not found."
  echo "Install Docker Desktop (or another Docker runtime) and re-run this script."
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  echo "No docker compose command found."
  echo "Install Docker Compose and re-run this script."
  exit 1
fi

echo "Bringing up Postgres..."
"${COMPOSE[@]}" up -d

echo "Waiting for Postgres health check..."
MAX_RETRIES=30
for attempt in $(seq 1 "${MAX_RETRIES}"); do
  if "${COMPOSE[@]}" exec -T db pg_isready -U postgres -d meshed >/dev/null 2>&1; then
    echo "Postgres is ready."
    break
  fi
  if [[ "${attempt}" -ge "${MAX_RETRIES}" ]]; then
    echo "Postgres did not become ready in time."
    "${COMPOSE[@]}" logs db
    exit 1
  fi
  sleep 2
done

echo "Applying Prisma schema with db push..."
npm run db:push
echo "Database setup complete."
