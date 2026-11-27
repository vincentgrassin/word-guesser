# Build context: repository root (see docker-compose*.yml)

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/
RUN pnpm install --frozen-lockfile --filter backend...

FROM deps AS dev
COPY packages/shared packages/shared
COPY packages/backend packages/backend
RUN pnpm --filter @word-guesser/shared build
WORKDIR /app/packages/backend
EXPOSE 3000
CMD ["pnpm", "dev"]

FROM dev AS build
RUN pnpm build

FROM base AS prod
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/backend/package.json packages/backend/
RUN pnpm install --frozen-lockfile --prod --filter backend...
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/packages/backend/build packages/backend/build
# Word vectors for the proximity scores, read from build/ as ../data/vectors.bin
COPY packages/backend/data packages/backend/data
WORKDIR /app/packages/backend
EXPOSE 3000
CMD ["node", "build/index.js"]
