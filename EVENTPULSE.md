# EventPulse API (Backend)

NestJS REST API for EventPulse. See repo root `IMPLEMENTATION_PLAN.md` for phased delivery.

## Phase B0 — Bootstrap

- Global prefix: `/api/v1`
- Config validation via `@nestjs/config`
- MongoDB via `@nestjs/mongoose`
- Global validation pipe and safe exception filter
- Health: `GET /api/v1/health`

## Phase B1 — Auth & users

- Cookie sessions (`eventpulse.sid`, HTTP-only) stored in MongoDB `sessions` collection
- `POST /api/v1/auth/register` — attendee signup (sets session)
- `POST /api/v1/auth/login` — optional `intendedRole` for `/admin` and `/staff` portals
- `POST /api/v1/auth/logout`
- `GET /api/v1/users/me` — current user (requires session)
- Roles: `attendee`, `gatekeeper`, `admin` with `RolesGuard`
- Rate limit: auth routes throttled (20 req / minute)
- Bootstrap admin: set `BOOTSTRAP_ADMIN_EMAIL` + `BOOTSTRAP_ADMIN_PASSWORD` on first boot

## Phase B2 — Events & packages (current)

**Public**

- `GET /api/v1/events` — published / sold_out / completed only (optional `category`, `from`, `to`)
- `GET /api/v1/events/:id`

**Admin** (session + `admin` role)

- `POST /api/v1/admin/events` — create draft
- `PATCH /api/v1/admin/events/:id`
- `PATCH /api/v1/admin/events/:id/status` — publish requires ≥1 active package
- `POST /api/v1/admin/events/:eventId/packages`
- `PATCH /api/v1/admin/packages/:packageId`

Admin mutations write to `auditLogs`.

## Local development

1. Copy environment file:

   ```bash
   cp .env.example .env
   ```

2. Start MongoDB locally or set `MONGODB_URI` to MongoDB Atlas.

3. Install and run:

   ```bash
   npm install
   npm run start:dev
   ```

4. Verify health:

   ```bash
   curl http://localhost:3000/api/v1/health
   ```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `PORT` | No | HTTP port (default `3000`) |
| `NODE_ENV` | No | `development`, `production`, or `test` |
| `CORS_ORIGIN` | No | Frontend origin for CORS (default `http://localhost:3001`) |
| `SESSION_SECRET` | Yes in production | Session signing secret (min 16 chars) |
| `BOOTSTRAP_ADMIN_EMAIL` | No | Creates first admin if no user with this email exists |
| `BOOTSTRAP_ADMIN_PASSWORD` | No | Password for bootstrap admin |

## Tests

```bash
npm test          # unit (Vitest)
npm run test:e2e  # e2e with in-memory MongoDB
npm run build     # compile
```
