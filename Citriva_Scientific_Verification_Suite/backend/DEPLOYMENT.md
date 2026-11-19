# Production Deployment Guide

Services: `api` (FastAPI), `worker` (Celery), `redis`, optional `grobid`. The `api` and `worker`
share one Docker image and differ only in start command. **Both need the same `REDIS_URL`.**

Environment variables (api and worker): `GEMINI_API_KEY`, `REDIS_URL`, `CORS_ORIGINS`,
`GROBID_URL` (optional), `UNPAYWALL_EMAIL`, `OPENALEX_MAILTO`, `TRUSTED_PROXY_COUNT`.

Start commands
- api: `sh -c "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"` (the image default)
- worker: `celery -A app.worker.celery_app:celery_app worker --loglevel=INFO --concurrency=2 -Q citriva`

---

## 1. GROBID on a Hugging Face Space (Docker SDK)

1. Hugging Face → **New Space** → SDK **Docker** → blank template → hardware **CPU basic** (GROBID's CRF image needs a few GB of RAM; the free tier is sufficient for small loads). Set visibility to Public (a private Space requires an `Authorization` header, which Citriva does not send).
2. Add `README.md` to the Space repo (front-matter configures the port):

   ```yaml
   ---
   title: GROBID
   sdk: docker
   app_port: 8070
   ---
   ```
3. Add `Dockerfile`:

   ```dockerfile
   FROM grobid/grobid:0.8.2-crf
   EXPOSE 8070
   ```
   Confirm the tag exists on Docker Hub (`hub.docker.com/r/grobid/grobid/tags`); if not, use the nearest 0.8.x CRF tag.
4. Wait for the build to finish and the Space to show **Running**. Test:
   `curl https://<user>-<space>.hf.space/api/isalive` → `true`.
5. Set `GROBID_URL=https://<user>-<space>.hf.space` (no trailing slash) on the **worker** service.
   Free Spaces sleep when idle; the first request after sleep is slow, and Citriva falls back to the Gemini parser on timeout.

## 2. Railway

1. **New Project → Deploy from GitHub repo** (push this folder). Railway builds the `Dockerfile`.
2. **+ New → Database → Add Redis.**
3. **api service** → Variables:
   `REDIS_URL=${{Redis.REDIS_URL}}`, `GEMINI_API_KEY`, `CORS_ORIGINS=https://your-frontend`, `UNPAYWALL_EMAIL`, `OPENALEX_MAILTO`, `TRUSTED_PROXY_COUNT=1`.
   Settings → **Networking → Generate Domain**; Settings → **Healthcheck Path** = `/health`.
4. **worker service** → duplicate the api service (or **+ New → GitHub repo** again), same variables (+ `GROBID_URL`), then Settings → **Custom Start Command** =
   `celery -A app.worker.celery_app:celery_app worker --loglevel=INFO --concurrency=2 -Q citriva`. Do **not** generate a public domain or healthcheck for it.
5. Redeploy both, then `curl https://<api-domain>/health` → `{"status":"ok","redis":"up"}`.

## 3. Render

Option A — Blueprint: commit `render.yaml`, then **New → Blueprint** and fill the `sync: false` secrets.
Option B — manual:
1. **New → Key Value** (Redis), name `citriva-redis`, **Maxmemory policy = noeviction**, copy the **Internal** connection string.
2. **New → Web Service** → this repo → Runtime **Docker**. Health Check Path `/health`. Env vars as above, `REDIS_URL` = internal connection string.
3. **New → Background Worker** → same repo → Runtime **Docker** → **Docker Command**:
   `celery -A app.worker.celery_app:celery_app worker --loglevel=INFO --concurrency=2 -Q citriva`; same env vars + `GROBID_URL`.
   (Background workers are not available on Render's free instance types.)

## 4. Post-deploy checklist

- `GET /health` returns 200 on the api.
- Upload a PDF, poll `/api/v1/jobs/{id}` until `completed`; check worker logs for `Job … completed`.
- Rate limiting: the 6th upload within an hour from one IP returns `429` with `Retry-After`. If *all* users share one limit, your platform adds a different number of proxy hops — change `TRUSTED_PROXY_COUNT`.
- `CORS_ORIGINS` must list your frontend origin exactly (scheme + host, no trailing slash).
- Redis memory: uploaded PDFs live for 1 hour and are deleted when processing ends; job reports are kept 24 hours.
