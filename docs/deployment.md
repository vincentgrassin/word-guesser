# Deployment

The game runs on a single VPS with Docker. This page describes what is on the server and how to update it.

## The server

| | |
| --- | --- |
| Host | Contabo Cloud VPS (EU), Ubuntu 24.04 LTS |
| Access | SSH as the admin user, **SSH key only**: root login and passwords are disabled |
| Firewall | `ufw`, open ports: 22 (SSH), 80 (HTTP), 443 (HTTPS) |
| Updates | Security updates install automatically (`unattended-upgrades`) |
| Docker | Docker Engine + Compose plugin, container logs capped at 3 × 10 MB (`/etc/docker/daemon.json`) |
| App | Cloned in `~/word-guesser`, started with `docker-compose.prod.yml` |
| Address | `http://<SERVER_IP>`, no domain or HTTPS yet |

The admin user is in the `sudo` and `docker` groups. If SSH stops working, use the VNC console in the Contabo panel with the root password.

## How the app runs

```
Internet ──▶ caddy (:80, :443) ──┬─ /connect/* ──▶ backend  (Node, :3000)
                                 └─ everything else ─▶ frontend (nginx, :80)
```

- **caddy** is the only container with published ports. It routes requests and will handle HTTPS once there is a domain.
- **backend** runs the game and its WebSockets. It reads `packages/backend/.env` when it starts. That file exists only on the server and is not in git.
- **frontend** serves the built Vue app. It needs no `.env`: it opens its WebSocket on the address the page was loaded from.

All three restart automatically after a crash or a server reboot (`restart: unless-stopped`).

Docker checks every 30 s that `backend` (`GET /health`) and `frontend` answer. `docker compose ps` shows the result as `healthy` or `unhealthy`. Caddy only starts once both are healthy.

### Saved games

The backend keeps the games in memory and saves them to `/app/data/state.json` (`STATE_FILE`) when it stops and every minute. The file lives in the `backend_data` Docker volume, so it survives deployments: games in progress continue after a restart, and the browsers reconnect on their own.

The file also holds a hash of each player's secret token, so nobody can take the id of a seated player after a restart. If the file is unreadable, the backend logs an error and starts with no games.

To start from scratch, delete the volume (this deletes every saved game):

```sh
docker compose -f docker-compose.prod.yml down
docker volume rm word-guesser_backend_data
docker compose -f docker-compose.prod.yml up -d
```

> Docker bypasses `ufw` for published ports. Never add `ports:` to `backend`, `frontend` or a database: route traffic through Caddy instead.

## Update the game

### Automatically

Every push to `master` deploys, if the `test`, `build` and `docker` checks of [the CI workflow](../.github/workflows/ci.yml) pass. Follow it in the repository's **Actions** tab.

The `deploy` job connects over SSH with a key dedicated to GitHub. On the server, that key is restricted in `~/.ssh/authorized_keys` to a single command, the manual update below. It can't open a shell or run anything else.

The job uses four repository secrets (**Settings → Secrets and variables → Actions**):

| Secret | Content |
| --- | --- |
| `SSH_HOST` | The server IP |
| `SSH_USER` | The admin user |
| `SSH_PRIVATE_KEY` | The private half of the deploy key |
| `SSH_KNOWN_HOSTS` | The server's host key line, from `ssh-keyscan -t ed25519 <SERVER_IP>` |

### By hand

On the server:

```sh
cd ~/word-guesser
git fetch origin
git reset --hard origin/master
docker compose -f docker-compose.prod.yml up --build -d
docker image prune -f
```

`fetch` + `reset --hard` puts the server's code exactly at GitHub's `master`, even if that history was rewritten (amend, force-push), where a `git pull` would refuse. The server is never a place to edit code: **any change made to tracked files on the server is erased by the next deployment**. Files git ignores, like `packages/backend/.env`, are kept.

`up --build -d` rebuilds the images and replaces only the containers that changed. `image prune` deletes the old images to save disk space.

In `~/.ssh/authorized_keys`, the deploy key line holds the same commands on one line:

```
command="cd ~/word-guesser && git fetch origin && git reset --hard origin/master && docker compose -f docker-compose.prod.yml up --build -d && docker image prune -f",restrict ssh-ed25519 AAAA... github-deploy
```

Games in progress survive the update (see [Saved games](#saved-games)). Players see a "Connection lost" banner for the few seconds the backend restarts.

### Roll back

The clean way is to revert the faulty commit on GitHub (`git revert`, then push to `master`): the pipeline deploys the fix like any other change.

For an emergency fix on the server:

```sh
cd ~/word-guesser
git log --oneline -5                 # find the last good commit
git checkout <commit>
docker compose -f docker-compose.prod.yml up --build -d
```

The next deployment brings the server back to the latest `master`, so revert the faulty commit on GitHub before pushing anything else.

## Day-to-day commands

Run from `~/word-guesser`. The `-f docker-compose.prod.yml` is required in every command.

| Task | Command |
| --- | --- |
| Status of the containers | `docker compose -f docker-compose.prod.yml ps` |
| Follow the logs | `docker compose -f docker-compose.prod.yml logs -f` (add `backend` for one service) |
| Restart the backend | `docker compose -f docker-compose.prod.yml restart backend` |
| Stop everything | `docker compose -f docker-compose.prod.yml down` |
| Disk usage | `df -h` and `docker system df` |
| Docker engine logs | `sudo journalctl -u docker` |

After changing `packages/backend/.env`, restart the backend for the change to apply.

## Not set up yet

- **Domain and HTTPS**: point the domain at the server, add `SITE_ADDRESS=<domain>` to a `.env` file in `~/word-guesser`, then run the update command. Caddy gets the certificate automatically.
- **Backups**: the only data is the saved games in the `backend_data` volume. They are short-lived (finished games are deleted after 10 minutes), so they are not backed up.
