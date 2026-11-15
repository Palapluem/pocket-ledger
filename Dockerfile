# PocketLedger production image: Bun/Elysia API serving the built web client (same origin).
# Build from a clean clone: docker build -t pocket-ledger --build-arg GIT_COMMIT=$(git rev-parse HEAD) .

FROM oven/bun:1.4.4 AS build
WORKDIR /app
COPY package.json bun.lock bunfig.toml tsconfig.json ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/config/package.json packages/config/
COPY packages/db/package.json packages/db/
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build:web

FROM oven/bun:1.4.4-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json bun.lock bunfig.toml tsconfig.json ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/config packages/config
COPY packages/db/package.json packages/db/
RUN bun install --frozen-lockfile --production
COPY packages/db/src packages/db/src
COPY apps/server/src apps/server/src
COPY --from=build /app/apps/web/dist apps/web/dist
COPY scripts/docker-entrypoint.sh scripts/docker-entrypoint.sh
ARG GIT_COMMIT=unknown
ENV GIT_COMMIT=$GIT_COMMIT WEB_DIST_DIR=/app/apps/web/dist PORT=8080
USER bun
EXPOSE 8080
ENTRYPOINT ["scripts/docker-entrypoint.sh"]
CMD ["serve"]
