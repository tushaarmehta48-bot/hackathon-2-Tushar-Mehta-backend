# Pulse Assistant — template keys (v1)

The assistant uses `POST /api/v1/assistant/turn` for orchestration only. **All prices, inventory, and bookings come from existing REST services** (`/events`, `/bookings/quote`, `/bookings`).

## Request shape

```json
{
  "state": "idle",
  "message": "show events",
  "locale": "en",
  "context": {
    "eventId": "...",
    "packageId": "...",
    "quantity": 2
  }
}
```

## Response shape

```json
{
  "turn": {
    "state": "selecting_event",
    "templateKey": "assistant.events.list",
    "locale": "en",
    "data": {}
  }
}
```

## Template keys

| Key | When | `data` fields |
|-----|------|----------------|
| `assistant.events.list` | Published events loaded | `events[]` with `id`, `title`, `startAt`, `venue`, `category` |
| `assistant.packages.list` | Packages for selected event | `eventId`, `packages[]` (from ticket-packages API shape) |
| `assistant.quote.ready` | Quote validated | `eventId`, `packageId`, `quantity`, `quote` |
| `assistant.confirm.required` | Waiting for yes/confirm | `context` |
| `assistant.booking.success` | Booking created | `bookingId`, `reference`, `tickets[]` with `qrToken` |
| `assistant.error.missing_event` | Missing event | `{}` |
| `assistant.error.missing_package` | Missing package | `{}` |
| `assistant.error.missing_context` | Missing booking context | `{}` |

## Hindi / English

Provide UI strings on the frontend keyed by `templateKey` + `locale`. Do not invent numbers in copy — always render from `data`.

## State machine

`idle` → `selecting_event` → `collecting_details` → `awaiting_confirmation` → `success` | `error`

Booking executes only after explicit confirmation (`yes`, `confirm`, `ok`, `haan`, `book`).
