# ElevenLabs agent → EventPulse booking webhooks

EventPulse exposes **server webhook tools** for your ElevenLabs Conversational AI agent. The agent can list events, show packages, sign in an attendee, quote, and create bookings through the same APIs the website uses.

## 1. Expose your API to ElevenLabs

ElevenLabs calls your server over the public internet. For local development:

```bash
ngrok http 3001
```

Use the HTTPS forwarding URL as **`WEBHOOK_BASE_URL`**, e.g. `https://abc123.ngrok-free.app`.

Production: use your deployed API origin (e.g. `https://api.yourdomain.com`).

## 2. Backend secret

In `backend/.env.local`:

```env
EVENTPULSE_AGENT_WEBHOOK_SECRET=your-long-random-secret-at-least-32-chars
```

Every tool request must send this value in a header:

```http
X-EventPulse-Agent-Secret: your-long-random-secret-at-least-32-chars
```

In the ElevenLabs tool editor, add the same header (type **Secret**) on each webhook tool.

## 3. Tool endpoints (POST, JSON body)

| Tool name (suggested) | URL |
|----------------------|-----|
| `list_events` | `{WEBHOOK_BASE_URL}/api/v1/agent/tools/list-events` |
| `list_event_packages` | `{WEBHOOK_BASE_URL}/api/v1/agent/tools/list-event-packages` |
| `sign_in_attendee` | `{WEBHOOK_BASE_URL}/api/v1/agent/tools/sign-in-attendee` |
| `quote_booking` | `{WEBHOOK_BASE_URL}/api/v1/agent/tools/quote-booking` |
| `create_booking` | `{WEBHOOK_BASE_URL}/api/v1/agent/tools/create-booking` |
| `list_my_bookings` | `{WEBHOOK_BASE_URL}/api/v1/agent/tools/list-my-bookings` |

Responses look like:

```json
{
  "result": "Human-readable summary for the LLM",
  "data": { }
}
```

### Body parameters (for ElevenLabs “Body parameters”)

**list_events** — optional

| Name | Type | Description |
|------|------|-------------|
| category | string | Filter by category |
| fromDate | string | ISO date; events starting on/after this day |

**list_event_packages**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| eventId | string | yes | MongoDB event id from list_events |

**sign_in_attendee**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| email | string | yes | Attendee account email |
| password | string | yes | Attendee password |

Returns `data.agentSessionToken` — the agent must pass this on quote/book/list booking calls (do not read the token aloud to the guest).

**quote_booking**

| Name | Type | Required |
|------|------|----------|
| agentSessionToken | string | yes |
| eventId | string | yes |
| packageId | string | yes |
| quantity | integer | yes |

**create_booking** — same as quote, plus:

| Name | Type | Required | Description |
|------|------|----------|-------------|
| userConfirmed | boolean | yes | `true` only after the guest clearly confirms the quote |

**list_my_bookings**

| Name | Type | Required |
|------|------|----------|
| agentSessionToken | string | yes |

## 4. Suggested agent system prompt

```text
You are Pulse, EventPulse's friendly voice assistant for discovering events and booking tickets.

Flow:
1. Help the guest find events with list_events (and list_event_packages for ticket options).
2. Before booking, they must sign in: collect email and password privately, then call sign_in_attendee.
3. Call quote_booking and read the total clearly. Ask for explicit confirmation.
4. Only when they say yes, call create_booking with userConfirmed: true.
5. After booking, tell them to open "My Bookings" on EventPulse for QR tickets.

Always use eventId and packageId from tool responses — never invent IDs.
Be warm, concise, and never use abusive language.
```

Attach all six tools to your agent in the ElevenLabs dashboard (**Agent → Tools**), then add the tool IDs to the agent prompt.

## 5. Security notes

- Rotate `EVENTPULSE_AGENT_WEBHOOK_SECRET` if it leaks.
- Use ElevenLabs **allowlist** for your site domain.
- Passwords are only sent server-to-server on `sign_in_attendee`; remind guests not to share passwords loudly in public places.
- `agentSessionToken` expires after 45 minutes.

Tool JSON snippets for copy-paste live in `backend/docs/elevenlabs/tool-configs/`.
