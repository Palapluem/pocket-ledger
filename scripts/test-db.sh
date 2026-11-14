#!/usr/bin/env bash
# Disposable PostgreSQL for integration tests. Owned resource: container pocket-ledger-test-pg,
# host port 55432 on loopback, data in tmpfs (nothing persists). Password is supplied locally.
set -euo pipefail
NAME=pocket-ledger-test-pg
PORT=${TEST_DB_PORT:-55432}
case "${1:-}" in
  up)
    : "${TEST_DB_PASSWORD:?set TEST_DB_PASSWORD locally}"
    docker run -d --rm --name "$NAME" -p "127.0.0.1:$PORT:5432" \
      -e POSTGRES_PASSWORD="$TEST_DB_PASSWORD" -e POSTGRES_DB=pocket_ledger_test \
      --tmpfs /var/lib/postgresql postgres:18.4 >/dev/null
    for _ in $(seq 1 60); do docker exec "$NAME" pg_isready -U postgres -d pocket_ledger_test >/dev/null 2>&1 && break; sleep 1; done; docker ps --filter name="$NAME" -q | grep -q . || { echo "container not running" >&2; exit 1; }
    echo "ready: postgresql://postgres:***@127.0.0.1:$PORT/pocket_ledger_test" ;;
  down) docker stop "$NAME" >/dev/null && echo stopped ;;
  *) echo "usage: $0 up|down" >&2; exit 2 ;;
esac
