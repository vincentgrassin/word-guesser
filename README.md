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

Built images with no mounted sources. [Caddy](https://caddyserver.com) is the only entry point: it sends `/connect/*` (WebSocket) to the backend and everything else to the frontend (nginx). The backend and frontend publish no ports.

```sh
pnpm docker:start-prod    # builds and starts in the background
pnpm docker:logs-prod
pnpm docker:stop-prod
```

Everything is on http://localhost. The frontend opens its WebSocket on the address it was loaded from, so the same images work on any host.

For HTTPS on a domain, point the domain at the server and set `SITE_ADDRESS` (in a `.env` file at the repo root, or in the shell) before starting:

```sh
SITE_ADDRESS=word-guesser.example.com
```

Caddy then gets and renews the certificate automatically.

The server setup and the update procedure are described in [docs/deployment.md](docs/deployment.md).

### Shell into a container

```sh
pnpm docker:sh-backend
pnpm docker:sh-frontend
```

## Regenerate the word vectors

The backend scores how close two words are in meaning with `packages/backend/data/vectors.bin`: French word vectors from [fastText](https://fasttext.cc/docs/en/crawl-vectors.html), restricted to the frequent words of [Lexique 3.83](http://www.lexique.org). The file is committed, so this is only needed to change how it is built.

```sh
pnpm --filter backend build-vectors <download-dir>
```

`<download-dir>` is any folder outside the repository (about 500 MB is downloaded into it, and kept for the next runs). The script checks each source against a fixed checksum and stops if one has changed. The same sources always give the same file.

## Credits

The word proximity scores come from two sources, both under Creative Commons licences:

- **fastText French word vectors** (`cc.fr.300`), by Facebook AI Research, [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). [fasttext.cc](https://fasttext.cc/docs/en/crawl-vectors.html). E. Grave, P. Bojanowski, P. Gupta, A. Joulin, T. Mikolov, _Learning Word Vectors for 157 Languages_, LREC 2018.
- **Lexique 3.83**, by Boris New and Christophe Pallier, [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). [lexique.org](http://www.lexique.org).

`packages/backend/data/vectors.bin` is derived from both, and is therefore shared under CC BY-SA 4.0.
