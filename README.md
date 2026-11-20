# word-guesser

A pnpm monorepo with three packages:

| Package             | What it is                           | Dev URL               |
| ------------------- | ------------------------------------ | --------------------- |
| `packages/frontend` | Vue 3 + Vite app                     | http://localhost:5173 |
| `packages/backend`  | Fastify server (HTTP + WebSocket)    | http://localhost:3000 |
| `packages/shared`   | Types and helpers used by both sides | —                     |

## Configuration

Each app reads a `.env` file. Create them from the examples before the first run:

```sh
cp packages/backend/.env.example packages/backend/.env
cp packages/frontend/.env.example packages/frontend/.env
```

| Variable                    | File     | Purpose                                                                  |
| --------------------------- | -------- | ------------------------------------------------------------------------ |
| `PORT`, `HOST`              | backend  | Where the server listens (`3000`, `0.0.0.0`)                             |
| `ENABLE_SEMANTIC_CHECK`     | backend  | `1` to score guesses by meaning with Hugging Face, `0` to turn it off    |
| `HUGGING_FACE_TOKEN`        | backend  | API token, needed only when the semantic check is on                     |
| `HUGGING_FACE_SEMANTIC_API` | backend  | URL of the Hugging Face model, needed only when the semantic check is on |
| `VITE_WEB_SOCKET_URL`       | frontend | Backend WebSocket address, e.g. `ws://localhost:3000`                    |

## Run locally

Requires Node 22 and pnpm 10 (`corepack enable` installs the pinned version).

```sh
pnpm install
pnpm build-shared   # compile packages/shared — rerun after changing it
```

Then, in two terminals:

```sh
pnpm dev-backend
pnpm dev-frontend
```

## Run with Docker

Requires Docker Desktop and `packages/backend/.env`. The frontend `.env` is not used: the compose files set `VITE_WEB_SOCKET_URL`.

### Development

Sources are mounted into the containers, and both servers reload when you save a file.

```sh
pnpm docker:start-build   # first run, or after changing dependencies or packages/shared
pnpm docker:start         # later runs
pnpm docker:logs
pnpm docker:stop
```

Frontend on http://localhost:5173, backend on http://localhost:3000.

### Production

Built images with no mounted sources: the backend runs the compiled code, and nginx serves the frontend.

```sh
pnpm docker:start-prod    # builds and starts in the background
pnpm docker:logs-prod
pnpm docker:stop-prod
```

Frontend on http://localhost:8080, backend on http://localhost:3000.

The WebSocket URL is built into the frontend. To use another one, set `VITE_WEB_SOCKET_URL` in your shell before `pnpm docker:start-prod`.

### Shell into a container

```sh
pnpm docker:sh-backend
pnpm docker:sh-frontend
```
