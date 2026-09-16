# syntax=docker/dockerfile:1
FROM dhi.io/bun:1-dev AS build
WORKDIR /app

ENV ASTRO_TELEMETRY_DISABLED=1

RUN apt-get update \
 && apt-get install -y --no-install-recommends git \
 && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

COPY . .
RUN bun run build \
 && bun build ./dist/server/entry.mjs --target bun --minify --outfile /tmp/entry.mjs \
 && rm -rf dist/server \
 && mkdir -p dist/server \
 && mv /tmp/entry.mjs dist/server/entry.mjs

FROM dhi.io/bun:1
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=80

COPY --from=build --chown=65532:65532 /app/dist ./dist

USER 65532:65532
EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["bun", "-e", "fetch('http://127.0.0.1:80/').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

CMD ["bun", "./dist/server/entry.mjs"]
