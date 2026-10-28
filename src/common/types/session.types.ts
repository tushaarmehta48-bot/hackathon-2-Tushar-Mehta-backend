import 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

export type SafeUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
};
