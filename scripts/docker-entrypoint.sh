#!/bin/sh
# Applies pending migrations (idempotent), seeds only missing users when SEED_USERS_JSON
# is provided (never changes existing users or financial data), then starts the server.
set -eu
cd /app/packages/db
bun run src/migrate.ts
if [ -n "${SEED_USERS_JSON:-}" ]; then
  bun run src/seed.ts
fi
cd /app
exec bun run apps/server/src/index.ts
