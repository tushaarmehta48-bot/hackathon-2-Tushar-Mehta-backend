const DEFAULT_DB_NAME = 'eventpulse';

/**
 * Fixes common copy/paste issues in Atlas connection strings.
 */
export function normalizeMongoUri(raw: string | undefined): string {
  if (!raw) {
    return '';
  }

  let uri = raw.trim();

  // Copy/paste often inserts a space after the scheme (breaks auth).
  uri = uri.replace(/^mongodb\+srv:\/\/\s+/i, 'mongodb+srv://');
  uri = uri.replace(/^mongodb:\/\/\s+/i, 'mongodb://');

  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    return uri;
  }

  try {
    const parsed = new URL(uri);
    const path = parsed.pathname.replace(/\/+$/, '');
    if (!path || path === '/') {
      parsed.pathname = `/${DEFAULT_DB_NAME}`;
    }

    const isAtlas =
      parsed.hostname.includes('mongodb.net') ||
      parsed.protocol === 'mongodb+srv:';

    if (isAtlas) {
      if (!parsed.searchParams.has('retryWrites')) {
        parsed.searchParams.set('retryWrites', 'true');
      }
      if (!parsed.searchParams.has('w')) {
        parsed.searchParams.set('w', 'majority');
      }
    }

    return parsed.toString();
  } catch {
    return uri;
  }
}

/** Host + db for logs (never includes credentials). */
export function describeMongoUri(uri: string): string {
  try {
    const parsed = new URL(uri);
    const db =
      parsed.pathname && parsed.pathname !== '/'
        ? parsed.pathname.slice(1)
        : DEFAULT_DB_NAME;
    return `${parsed.hostname}/${db}`;
  } catch {
    return '(invalid URI)';
  }
}
