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

## Phase B2 — Events & packages

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

## Phase B3 — Inventory & availability

- `GET /api/v1/events/:id/ticket-packages` — active packages with `quantityRemaining`, `onSale`
- `GET /api/v1/events/:id/availability` — event + package aggregates; syncs `sold_out` when inventory is exhausted
- `GET /api/v1/admin/events/:id/inventory` — admin view (includes inactive packages)

## Phase B4 — Bookings & tickets

- `POST /api/v1/bookings/quote` — live price/inventory validation (auth required)
- `POST /api/v1/bookings` — atomic booking + ticket/QR issuance (MongoDB transaction)
- `GET /api/v1/bookings/me`, `GET /api/v1/bookings/:id`, `GET /api/v1/bookings/:id/tickets`
- `POST /api/v1/bookings/:id/cancel` — restores inventory when allowed
- Enforces event-level and package-level purchase limits

## Phase B5 — Gatekeeper check-in

**Admin**

- `GET /api/v1/admin/gatekeepers`
- `POST /api/v1/admin/gatekeepers`
- `POST /api/v1/admin/gatekeepers/:id/assignments`

**Gatekeeper** (session + `gatekeeper` role)

- `GET /api/v1/gatekeeper/assignments`
- `POST /api/v1/gatekeeper/check-in` — body: `{ qrToken, gateId? }`  
  Results: `success`, `already_used`, `invalid`, `cancelled`, `wrong_event`, `unauthorised`

## Phase B6 — Admin analytics

- `GET /api/v1/admin/analytics?eventId=` — per-event or all events: sold, remaining, admissions checked-in, check-in rate, revenue
- `GET /api/v1/admin/check-ins` — filters: `eventId`, `gatekeeperId`, `gateId`, `packageId`, `result`, `from`, `to` (no attendee PII)

## Phase B7 — Feedback & audit

- `POST /api/v1/events/:eventId/feedback` — confirmed booking, after event end; one per booking
- `GET /api/v1/admin/feedback` — filter by `eventId`, `moderationStatus`
- `PATCH /api/v1/admin/feedback/:id/moderation` — `visible` / `hidden`
- `GET /api/v1/admin/audit-logs` — filter by `actorId`, `targetType`, `targetId`, `from`, `to`

## Phase B8 — Assistant, realtime, OpenAPI (complete)

- `POST /api/v1/assistant/turn` — state machine orchestration; see `backend/docs/ASSISTANT_TEMPLATES.md`
- Socket.IO namespace `/realtime` — cookie session auth; `join` → `admin` or `event:{eventId}`
- Events: `check-in:update`, `inventory:update`
- Swagger UI: `http://localhost:3000/api/docs`

**Backend sign-off:** Phases B0–B8 complete — frontend may start (see root `IMPLEMENTATION_PLAN.md`).

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
