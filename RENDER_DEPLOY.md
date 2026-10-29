# Deploy EventPulse API on Render

**Service:** [hackathon-2-Tushar-Mehta-backend](https://dashboard.render.com/web/srv-dbhho349v7es73b0672g)  
**Public URL:** `https://hackathon-2-tushar-mehta-backend.onrender.com`  
**API base:** `https://hackathon-2-tushar-mehta-backend.onrender.com/api/v1`

## Dashboard settings (must match)

| Setting | Value |
|--------|--------|
| **Root directory** | *(empty — repo root is the backend)* |
| **Build command** | `npm ci && npm run build` |
| **Start command** | `npm start` |
| **Health check path** | `/api/v1/health` |

## Environment variables (Render → Environment)

Set these in the [service Environment tab](https://dashboard.render.com/web/srv-dbhho349v7es73b0672g):

| Variable | Required | Example / notes |
|----------|----------|-----------------|
| `NODE_ENV` | yes | `production` |
| `MONGODB_URI` | yes | Your MongoDB Atlas connection string (same as local) |
| `SESSION_SECRET` | yes | Long random string (32+ chars). Use **Generate** in Render. |
| `CORS_ORIGIN` | yes | Frontend origin, e.g. `https://your-frontend.onrender.com` or `http://localhost:3000` for testing |
| `BOOTSTRAP_ADMIN_EMAIL` | recommended | Admin login email |
| `BOOTSTRAP_ADMIN_PASSWORD` | recommended | Admin password (first boot only) |
| `EVENTPULSE_AGENT_WEBHOOK_SECRET` | optional | ElevenLabs agent tools secret |

Render sets **`PORT`** automatically — do not override it.

## Frontend after deploy

In `frontend/.env.local` (or Vercel/Render env):

```env
NEXT_PUBLIC_API_URL=https://hackathon-2-tushar-mehta-backend.onrender.com/api/v1
```

Redeploy the frontend so API calls hit Render.

## Deploy steps

1. Commit and push backend fixes to `main` on  
   `https://github.com/tushaarmehta48-bot/hackathon-2-Tushar-Mehta-backend`
2. Confirm env vars in Render (especially `MONGODB_URI`, `CORS_ORIGIN`, `SESSION_SECRET`).
3. **Manual Deploy → Deploy latest commit** (or wait for auto-deploy).
4. Verify: open  
   `https://hackathon-2-tushar-mehta-backend.onrender.com/api/v1/health`  
   → `{"status":"ok","mongodb":"connected",...}`

## Notes

- **Uploaded event images** live on the container disk and are **lost on redeploy** (Render ephemeral filesystem). For production, use S3/R2 or MongoDB GridFS later.
- **Free tier** spins down after ~15 minutes idle; first request may be slow (cold start).
- Cross-origin login (frontend on a different domain) uses `SameSite=None` cookies when `CORS_ORIGIN` is not localhost.
