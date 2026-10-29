/** Allow localhost and dev URLs from EventPulse uploads. */
export const EVENT_IMAGE_URL_OPTIONS = {
  require_tld: false,
  protocols: ['http', 'https'] as string[],
  require_protocol: true,
};
