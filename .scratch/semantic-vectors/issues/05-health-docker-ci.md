# 05 - Ship the vector file: health check, Docker, CI

Status: open
Blocked by: 02

## What

Make sure the vector file reaches production, and that a degraded mode cannot go unnoticed.

## Changes

- `/health` (`packages/backend/src/server.ts`) returns `{ status: 'ok', semantic: 'on' | 'off' }`.
- Startup: in degraded mode, a clear error log saying semantics are off and why (file path, error).
- `packages/backend/Dockerfile`, `prod` stage: copy `packages/backend/data/` into the image. Today only `build/` is copied, so the file would be missing in production. Check the path the module reads from resolves the same way in dev (`tsx src/`) and prod (`node build/`).
- CI (`.github/workflows/ci.yml`): a step that loads the real `vectors.bin` and fails if semantics are off.
- `docs/deployment.md`: after a deploy, check `curl <host>/health` shows `semantic: "on"`. Check whether Caddy routes `/health` to the backend; if not, document how to check it from the server instead.

## Done when

- `docker compose -f docker-compose.prod.yml up` gives `semantic: "on"`.
- Deleting the file locally gives `semantic: "off"`, an error log, and a game that still works.
- CI fails if the file is missing or unreadable.

## Comments
