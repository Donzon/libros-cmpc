#!/usr/bin/env sh
# Smoke T19: verifica que Swagger (/api/docs) responde 200 en el backend levantado.
# Uso: ./scripts/smoke-docs.sh [BASE_URL]   (default http://localhost:3000)
set -eu

BASE_URL=${1:-http://localhost:3000}

status=$(curl -s -L -o /dev/null -w '%{http_code}' "$BASE_URL/api/docs")
if [ "$status" != "200" ]; then
  echo "smoke-docs: GET $BASE_URL/api/docs -> $status (esperado 200)" >&2
  exit 1
fi

status=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/docs-json")
if [ "$status" != "200" ]; then
  echo "smoke-docs: GET $BASE_URL/api/docs-json -> $status (esperado 200)" >&2
  exit 1
fi

echo "smoke-docs: /api/docs y /api/docs-json OK"
