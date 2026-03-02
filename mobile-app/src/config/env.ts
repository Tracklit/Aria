const PRODUCTION_MOBILE_BACKEND_BASE_URL =
  'https://app-tracklit-prod-tnrusd.azurewebsites.net';
const PRODUCTION_AI_API_BASE_URL = 'https://aria-dev-api.azurewebsites.net';

const ALLOWED_MOBILE_BACKEND_HOSTS = new Set([
  'app-tracklit-prod-tnrusd.azurewebsites.net',
  'app-tracklit-dev-kvnx2h.azurewebsites.net',
  'app-aria-mobile-prod.azurewebsites.net',
]);

const ALLOWED_AI_API_HOSTS = new Set([
  'aria-dev-api.azurewebsites.net',
  'aria-dev-api-alt-fqks2g.azurewebsites.net',
]);

// In some Hermes builds `process` may be undefined. Guard access so
// env resolution never crashes during module initialization.
const processEnv: Record<string, string | undefined> =
  ((globalThis as any)?.process?.env as Record<string, string | undefined>) ??
  {};

const resolveApiBaseUrl = (
  candidate: string | undefined,
  fallbackUrl: string,
  allowedHosts: Set<string>,
) => {
  if (!candidate) return fallbackUrl;

  try {
    const url = new URL(candidate);
    if (!allowedHosts.has(url.hostname)) {
      return fallbackUrl;
    }
    return url.origin;
  } catch {
    return fallbackUrl;
  }
};

const MOBILE_BACKEND_BASE_URL = resolveApiBaseUrl(
  processEnv.EXPO_PUBLIC_MOBILE_BACKEND_BASE_URL ||
    processEnv.EXPO_PUBLIC_API_BASE_URL ||
    processEnv.EXPO_PUBLIC_API_URL ||
    processEnv.API_BASE_URL,
  PRODUCTION_MOBILE_BACKEND_BASE_URL,
  ALLOWED_MOBILE_BACKEND_HOSTS,
);

const AI_API_BASE_URL = resolveApiBaseUrl(
  processEnv.EXPO_PUBLIC_AI_API_BASE_URL ||
    processEnv.AI_API_BASE_URL ||
    processEnv.ARIA_API_URL,
  PRODUCTION_AI_API_BASE_URL,
  ALLOWED_AI_API_HOSTS,
);

export const env = {
  // `API_BASE_URL` remains for backwards compatibility; it always points
  // to the mobile backend service, never directly to the AI app service.
  API_BASE_URL: MOBILE_BACKEND_BASE_URL.replace(/\/$/, ''),
  MOBILE_BACKEND_BASE_URL: MOBILE_BACKEND_BASE_URL.replace(/\/$/, ''),
  AI_API_BASE_URL: AI_API_BASE_URL.replace(/\/$/, ''),
};
