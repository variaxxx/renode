# syntax=docker/dockerfile:1
FROM oven/bun:1.4.2 AS dependencies
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN bun install --frozen-lockfile

FROM dependencies AS build
COPY . .
RUN bun run lint && bun run format:check && bun run build

FROM oven/bun:1.4.2 AS backend
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000
COPY --from=build --chown=bun:bun /app/node_modules ./node_modules
COPY --from=build --chown=bun:bun /app/apps/backend ./apps/backend
WORKDIR /app/apps/backend
USER bun
EXPOSE 3000
CMD ["bun", "run", "start:api"]

FROM nginx:stable-alpine AS web
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
EXPOSE 80
