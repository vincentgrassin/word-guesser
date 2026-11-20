# Build context: repository root (see docker-compose*.yml)

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/frontend/package.json packages/frontend/
RUN pnpm install --frozen-lockfile --filter frontend...

FROM deps AS dev
COPY packages/shared packages/shared
COPY packages/frontend packages/frontend
RUN pnpm --filter @word-guesser/shared build
WORKDIR /app/packages/frontend
EXPOSE 5173
CMD ["pnpm", "dev"]

FROM dev AS build
# Vite inlines VITE_* variables at build time
ARG VITE_WEB_SOCKET_URL=ws://localhost:3000
ENV VITE_WEB_SOCKET_URL=${VITE_WEB_SOCKET_URL}
RUN pnpm build-only

FROM nginx:1.27-alpine AS prod
COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/packages/frontend/dist /usr/share/nginx/html
EXPOSE 80
