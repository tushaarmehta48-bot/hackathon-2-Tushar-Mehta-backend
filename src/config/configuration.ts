const defaultSessionSecret =
  'dev-only-change-me-before-production-32chars';

export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  mongodb: {
    uri: process.env.MONGODB_URI ?? '',
  },
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3001',
  session: {
    secret: process.env.SESSION_SECRET ?? defaultSessionSecret,
  },
  bootstrapAdmin: {
    email: process.env.BOOTSTRAP_ADMIN_EMAIL,
    password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
  },
});
