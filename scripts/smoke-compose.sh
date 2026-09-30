#!/usr/bin/env sh
# Smoke T1: valida que docker-compose.yml es sintácticamente correcto.
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT_DIR"

docker compose config >/dev/null
echo "smoke-compose: docker compose config OK"
