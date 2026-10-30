# muse-marketplace as a container image (GHCR).
# The image runs the same bin as the npm package: dist/cli.js.
# Default command is "mcp", so `docker run -i <image>` is a stdio MCP server;
# any other arguments reach the CLI normally.
# Two-stage build (fleet pattern): stage 1 installs ALL dependencies
# (typescript is a devDependency - the previous single-stage Dockerfile
# ran `npm ci --omit=dev` and then `npm run build || true`, which silently
# produced an image with no dist/ at all; the GHCR smoke test caught it on
# 2026-10-30 with "Cannot find module '/app/dist/cli.js'").
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev --no-audit --no-fund

FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY registry ./registry
COPY site ./site
USER node
ENTRYPOINT ["node", "/app/dist/cli.js"]
CMD ["mcp"]
LABEL io.modelcontextprotocol.server.name="io.github.CloudCorpRecords/muse-marketplace"
