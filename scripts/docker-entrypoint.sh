#!/bin/sh
# Container modes:
#   migrate  apply pending migrations (advisory-locked), insert only missing seed users
#            when SEED_USERS_JSON is set, then exit. Cloud Run runs this once per release
#            as a job with the migration credential, before the service is updated.
#   serve    (default) start the server with the runtime credential. RUN_MIGRATIONS=true
#            runs the migrate step first; only local docker compose uses that.
set -eu
migrate() {
  cd /app/packages/db
  bun run src/migrate.ts
  if [ -n "${SEED_USERS_JSON:-}" ]; then
    bun run src/seed.ts
  fi
  cd /app
}
case "${1:-serve}" in
  migrate) migrate ;;
  serve)
    if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then migrate; fi
    exec bun run apps/server/src/index.ts ;;
  *) echo "usage: docker-entrypoint.sh [serve|migrate]" >&2; exit 2 ;;
esac
