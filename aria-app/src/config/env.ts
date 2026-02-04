const PRODUCTION_API_BASE_URL =
  'https://app-tracklit-prod-tnrusd.azurewebsites.net';

const ALLOWED_API_HOSTS = new Set([
  'app-tracklit-prod-tnrusd.azurewebsites.net',
]);

// In some Hermes builds `process` may be undefined. Guard access so
// env resolution never crashes during module initialization.
const processEnv: Record<string, string | undefined> =
  ((globalThis as any)?.process?.env as Record<string, string | undefined>) ??
  {};

const resolveApiBaseUrl = (candidate?: string) => {
  if (!candidate) return PRODUCTION_API_BASE_URL;

  try {
    const url = new URL(candidate);
    if (!ALLOWED_API_HOSTS.has(url.hostname)) {
      return PRODUCTION_API_BASE_URL;
    }
    return url.origin;
  } catch {
    return PRODUCTION_API_BASE_URL;
  }
};

const API_BASE_URL = resolveApiBaseUrl(
  processEnv.EXPO_PUBLIC_API_BASE_URL ||
    processEnv.EXPO_PUBLIC_API_URL ||
    processEnv.API_BASE_URL,
);

export const env = {
  API_BASE_URL: API_BASE_URL.replace(/\/$/, ''),
};
