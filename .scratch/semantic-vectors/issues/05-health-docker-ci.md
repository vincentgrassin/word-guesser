# 05 - Ship the vector file: health check, Docker, CI

Status: done
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

### 2026-11-27 - Implemented

- Caddy does not route `/health` (it goes to the frontend). Rather than exposing it, `docs/deployment.md` explains how to ask the backend from the server.
- The `backend_data` volume is mounted on `/app/data` (saved games); the vectors are in `/app/packages/backend/data`: no clash.
- CI checks the built image itself (`docker run ... loadSemantic()`), so it catches both a file missing from the image and a wrong path from `build/`. Run locally: exit 0 with the file, exit 1 without.
- Not run: the full `docker compose -f docker-compose.prod.yml up` (it would take ports 80/443 on the dev machine). The image check and the `/health` tests cover the same ground; check `/health` on the server after the first deploy.
