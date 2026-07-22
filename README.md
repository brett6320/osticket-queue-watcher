# osticket-queue-watcher

Inbound email -> Cloudflare Queue -> osTicket ticket, in two pieces:

- `worker/` — Cloudflare Worker with Email Routing bound to a Queue producer. Receives mail, parses it, pushes a JSON message to the queue.
- `watcher/` — Node/TypeScript container. Polls the queue via the Queues HTTP Pull Consumer API and creates a ticket in osTicket via its REST API.

## 1. Queue

```bash
cd worker
npx wrangler queues create osticket-tickets
```

Configure it as a **pull-based** consumer (the container polls it directly, no push consumer worker):

```bash
npx wrangler queues consumer add osticket-tickets --type=http_pull
```

Grab the queue ID for the watcher's `CF_QUEUE_ID`:

```bash
npx wrangler queues list
```

## 2. Worker (receive email, enqueue)

```bash
cd worker
npm install
npx wrangler queues create osticket-tickets   # if not already created
npm run deploy
```

Then in the Cloudflare dashboard: **Email Service > Email Routing > Routing Rules**, point the target address at this Worker.

## 3. Watcher (poll queue, create osTicket tickets)

Needs an API token with `Queues Read` + `Queues Write` account permissions, and an osTicket API key (Admin Panel > Manage > API Keys, with the container's egress IP allow-listed).

```bash
cd watcher
cp .env.example .env   # fill in CF_ACCOUNT_ID, CF_API_TOKEN, CF_QUEUE_ID, OSTICKET_URL, OSTICKET_API_KEY
npm install
npm run dev             # local run
```

Build and run the container:

```bash
docker build -t osticket-queue-watcher .
docker run --env-file .env osticket-queue-watcher
```

Or via Compose (builds from `watcher/Dockerfile` by default; drop the `build:` key in `docker-compose.yml` to pull the published image instead):

```bash
docker compose up -d
```

## Diagnostics

`.diag/pull-diag.sh` (gitignored, host-side) does a raw curl against the Queues Pull API — useful since it's a public endpoint reachable from the host.

The osTicket connectivity check instead runs *inside* the watcher container, since `OSTICKET_URL` is typically an internal hostname (e.g. `http://osticket`) only resolvable on the container's own network:

```bash
docker exec <container-name> /nodejs/bin/node dist/diag/osticket.js
```

(`/nodejs/bin/node` because the distroless base doesn't put `node` on `PATH` for `docker exec`, and there's no shell to fall back on.) It creates a dummy ticket ("[diag] osTicket API connectivity test") using the container's actual env vars and network, and prints the HTTP result.

## CI/CD

`.github/workflows/docker-build.yml` builds the watcher image natively for `linux/amd64` and `linux/arm64` on every PR and push to `main`, scans each arch with Trivy (blocks on fixable CRITICAL/HIGH), and on `main` merges both into one multi-arch manifest pushed to `ghcr.io/<repo>/watcher` as `:latest` and `:<sha>`.

On top of that, a `release` job runs [semantic-release](https://semantic-release.gitbook.io/) against [Conventional Commits](https://www.conventionalcommits.org/) on `main`. When commits since the last release warrant a version bump (`fix:` → patch, `feat:` → minor, `BREAKING CHANGE:` → major), it:

- Tags a GitHub Release with generated notes (no committed `CHANGELOG.md` — `main` requires PRs for all changes, so nothing pushes a commit directly to it).
- Retags the already-pushed manifest (no rebuild) as `:vX.Y.Z`, `:vX`, and `:vX.Y`.

Commits like `chore:`/`docs:`/`refactor:` still get built and pushed to `:latest`/`:<sha>`, just without cutting a versioned release.

`.github/workflows/codeql.yml` runs CodeQL `security-extended` over the JS/TS in `worker/` and `watcher/`.

## Message flow

1. Email hits the routing address -> `worker/src/index.ts` `email()` handler parses it with `postal-mime` and calls `env.TICKET_QUEUE.send()`.
2. `watcher/src/index.ts` polls `POST /queues/{id}/messages/pull` every `POLL_INTERVAL_MS`, decodes the base64 JSON body, and calls osTicket's `POST /api/tickets.json`.
3. On success the message is acked (`POST /queues/{id}/messages/ack`); on failure it's put back for retry with a delay.
