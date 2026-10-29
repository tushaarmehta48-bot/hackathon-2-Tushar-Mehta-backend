import { normalizeMongoUri } from './mongodb-uri.js';

const defaultSessionSecret =
  'dev-only-change-me-before-production-32chars';

export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3001', 10),
  mongodb: {
    uri: normalizeMongoUri(process.env.MONGODB_URI),
  },
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  session: {
    secret: process.env.SESSION_SECRET ?? defaultSessionSecret,
  },
  bootstrapAdmin: {
    email: process.env.BOOTSTRAP_ADMIN_EMAIL,
    password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
  },
  agentWebhook: {
    secret:
      process.env.EVENTPULSE_AGENT_WEBHOOK_SECRET ??
      'dev-agent-webhook-secret-change-me-32+',
  },
});
