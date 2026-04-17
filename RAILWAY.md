# Deploying to Railway

This is a soup-to-nuts walkthrough. Plan for 30-45 minutes for a first deploy.

## What you'll end up with

Three services in one Railway project:

| Service    | What it is                          | Source                        |
|------------|-------------------------------------|-------------------------------|
| `postgres` | Managed Postgres 16                 | Railway addon                 |
| `backend`  | FastAPI + Alembic + APScheduler     | Your repo, `backend/` folder  |
| `frontend` | Next.js in standalone mode          | Your repo, `frontend/` folder |

Total cost on the Hobby plan: ~$5/month for Postgres plus metered compute
(usually a few dollars for a hobby-scale app).

---

## 0. Before you start

Push your project to a GitHub repo. Railway deploys from GitHub. The repo
layout should look like:

```
your-repo/
├── backend/
│   ├── Dockerfile
│   ├── railway.json
│   └── ...
└── frontend/
    ├── Dockerfile
    ├── railway.json
    └── ...
```

Both `Dockerfile`s and `railway.json` files are already in place from the
deployment package.

---

## 1. Create the project

1. Go to <https://railway.com> and click **New Project**
2. Choose **Deploy from GitHub repo** → pick your repo
3. Railway will try to auto-detect a service. Skip that for now —
   **delete any auto-created service**. We'll add them explicitly.

---

## 2. Add Postgres

1. In the project, click **Create** → **Database** → **Add PostgreSQL**
2. Wait ~30 seconds for it to provision
3. Click the Postgres service. Under **Variables**, confirm
   `DATABASE_URL` is present. You don't need to change anything here.

---

## 3. Add the backend service

1. Click **Create** → **GitHub Repo** → pick your repo again
2. Name the service `backend`
3. Under **Settings**:
   - **Root Directory**: `backend`
   - **Builder**: should auto-detect as Dockerfile (from `railway.json`)
   - **Healthcheck Path**: `/health` (should auto-fill from `railway.json`)
4. Under **Variables**, add these. Use Railway's reference syntax where
   indicated — it looks like `${{ServiceName.VAR}}` and links to the
   other service's live value.

   ```
   ENVIRONMENT=production
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   JWT_SECRET=<generate a random string — see below>
   BOOTSTRAP_TOKEN=<generate a second random string>
   CORS_ORIGINS=<fill in after you deploy the frontend>
   AI_PROVIDER=anthropic
   ANTHROPIC_API_KEY=sk-ant-...
   ALPACA_API_KEY=...
   ALPACA_SECRET_KEY=...
   FINNHUB_API_KEY=...
   ```

   **To generate `JWT_SECRET` and `BOOTSTRAP_TOKEN`:**
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(48))"
   ```
   Run it twice — one for each. `JWT_SECRET` must be 32+ characters.
   `BOOTSTRAP_TOKEN` gates the one-time web UI that creates your first user;
   you'll unset it immediately after using it.

5. Leave `CORS_ORIGINS` blank for now — you can't know the frontend's
   URL yet. We'll fill it in after step 4.

6. Click **Deploy**. First build takes ~3 minutes.

7. Once deployed, under **Settings** → **Networking**, click
   **Generate Domain**. Railway will give you something like
   `backend-production-abcd.up.railway.app`. Note this URL.

8. Test the backend is alive:
   ```bash
   curl https://backend-production-abcd.up.railway.app/health
   # Should return: {"status":"ok"}
   ```

---

## 4. Add the frontend service

1. Click **Create** → **GitHub Repo** → pick your repo
2. Name it `frontend`
3. Under **Settings**:
   - **Root Directory**: `frontend`
   - **Builder**: Dockerfile (auto-detected)
   - **Healthcheck Path**: `/`

4. Under **Variables**, add — using the backend URL from step 3:

   ```
   NEXT_PUBLIC_API_URL=https://backend-production-abcd.up.railway.app
   NEXT_PUBLIC_WS_URL=wss://backend-production-abcd.up.railway.app
   ```

   **Critical detail:** `wss://` not `ws://`, and `https://` not `http://`.
   Browsers block mixed-protocol content in production.

   Also: these are `NEXT_PUBLIC_*` variables, which means they're baked
   into the client JavaScript bundle at **build time**. If you later
   change the backend URL, you must redeploy the frontend to pick it up.

5. Deploy. First build takes ~4 minutes (Next.js builds are slower).

6. Once deployed, generate a domain for the frontend too. Note this URL.

---

## 5. Finish the loop — tell the backend about the frontend

1. Go back to the **backend** service
2. Under **Variables**, set:
   ```
   CORS_ORIGINS=https://frontend-production-wxyz.up.railway.app
   ```
   (Use your actual frontend domain from step 4.)

3. Railway will automatically redeploy the backend with the new value.
   Takes ~1 minute.

---

## 6. Create your user account

Visit `https://<your-frontend-domain>/setup` and enter:

- Your `BOOTSTRAP_TOKEN` (from step 3)
- A username
- A password (8+ characters, under 72 bytes for bcrypt)

On success the app logs you in and redirects to the dashboard.

**Now remove the token.** Back in the backend service's **Variables**,
delete `BOOTSTRAP_TOKEN`. The service redeploys in under a minute. Once
the token is gone, the setup endpoint refuses all requests — even if
someone guesses your token later, it no longer exists on the server.

The CLI flow still works if you prefer it:

```bash
npm install -g @railway/cli
railway login
railway link
railway run python -m scripts.create_user
```

---

## 7. Seed some data

You can add tickers from the UI now that you can log in. But the first
briefing/chat works best with some data already pulled. You have two options:

**Option A — Use the UI (recommended):**
1. Log in to your frontend URL
2. Add 3-5 tickers to your watchlist
3. The watchlist's "Refresh data & score news" button handles everything
4. Generate a briefing

**Option B — Seed from the CLI:**
```bash
railway run python -m scripts.fetch_data
railway run python -m scripts.score_news
```

---

## Ongoing operations

### Checking logs

Railway's web UI has a **Deployments** tab per service showing live logs.
You can also use the CLI:
```bash
railway logs --service backend
railway logs --service frontend
```

The scheduler's 07:00 briefing job prints to stdout, so it'll appear in
the backend logs.

### Updating

Push to your default branch. Railway auto-deploys both services. The
backend runs migrations automatically on startup via `entrypoint.sh`.

### Database access

The Postgres service has a **Connect** tab with a ready-to-run `psql`
command. Use it for manual inspection or one-off queries.

```sql
-- Example: recent interactions cost breakdown
SELECT
  DATE(timestamp) AS day,
  purpose,
  COUNT(*) AS n,
  ROUND(SUM(cost_usd)::numeric, 4) AS cost
FROM interactions
GROUP BY 1, 2
ORDER BY 1 DESC, 2;
```

### Rolling back a bad deploy

Each deploy gets a snapshot. On the service's **Deployments** tab, any
previous deploy has a "..." menu → **Rollback**. Rolls the app back in
under a minute; database state is not touched.

---

## Things to watch for

**CORS errors on first load.** Usually means `CORS_ORIGINS` on the backend
doesn't match the frontend's actual domain. Check the backend's env vars
and make sure there's no trailing slash or typo.

**WebSocket fails to connect.** Open the browser devtools Network tab,
filter to WS. If the request is `ws://` instead of `wss://`, your
`NEXT_PUBLIC_WS_URL` is wrong and you need to rebuild the frontend.

**"JWT_SECRET must be set" on startup.** Your `JWT_SECRET` is either
missing, too short, or still the placeholder. Generate a real one.

**Briefing scheduler fires but nothing appears.** The scheduler runs at
07:00 America/New_York. Check:
- Is the user account created?
- Does the watchlist have tickers?
- Is there recent bar data? (The scheduler doesn't refresh data
  automatically before briefing — that's the manual "Refresh data" button
  or the `fetch_data` script.)

**Build fails with "Cannot find module 'server.js'".** This means Next.js
didn't emit the standalone output. Check that `output: "standalone"` is
present in `next.config.mjs`.

**Migrations fail on first deploy.** Check the backend logs. Most common
cause: an old database with existing tables that conflict. For a clean
first deploy, make sure Postgres is empty.

---

## Costs (rough, Hobby plan)

- Postgres: $5/month minimum
- Backend compute: $2-4/month (scales with usage; mostly idle)
- Frontend compute: $2-3/month
- **Total: ~$10-15/month** for light personal use

AI usage costs are separate — paid directly to Anthropic/OpenRouter.
Expect $2-10/month for daily briefings plus interactive chat.

---

## Known limits of this deployment

**Single replica.** Scheduler and chat state both assume one process.
If you scale to multiple replicas, the scheduler will fire jobs multiple
times and WebSocket sessions won't be sticky across instances. Not a
problem at hobby scale.

**No job queue.** Background data fetches run in-process. If the
container restarts during a refresh, that refresh is dropped. User hits
the button again, no harm done.

**No email/notifications.** The briefing only exists in the app. You
have to open it to see it. (Email briefings are a logical next step if
you want them.)

**Single user.** Schema supports multi-user but the flow doesn't —
there's no signup, password reset, or account management UI. Fine for
a personal tool; would need real auth work for anything else.
