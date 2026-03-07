import * as WebBrowser from 'expo-web-browser';
import { apiRequest } from '../lib/api';
import type { ConnectedDevice } from '../context/HealthContext';

const GARMIN_REDIRECT_URI = 'aria://integrations/garmin/callback';
const POLL_INTERVAL_MS = 2000;

/**
 * Initiates the Garmin OAuth flow via Terra:
 * 1. POST /api/integrations/connect to get auth URL (or create placeholder)
 * 2. If authUrl returned, open browser for user authorization
 * 3. Poll backend until garmin shows as connected
 */
export async function connectGarmin(): Promise<boolean> {
  const result = await apiRequest<{ authUrl?: string } & Partial<ConnectedDevice>>(
    '/api/integrations/connect',
    { method: 'POST', data: { provider: 'garmin' } }
  );

  if (result.authUrl) {
    // Terra-based OAuth flow
    const browserResult = await WebBrowser.openAuthSessionAsync(
      result.authUrl,
      GARMIN_REDIRECT_URI
    );

    if (browserResult.type !== 'success') {
      return false; // User cancelled
    }

    // Poll for connection status since Garmin uses webhooks
    return pollForConnection(15);
  }

  // Direct connection (placeholder record created)
  return true;
}

/**
 * Polls GET /api/integrations until garmin shows as connected.
 */
export async function pollForConnection(maxAttempts: number = 10): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const devices = await apiRequest<ConnectedDevice[]>('/api/integrations');
      const garmin = devices.find((d) => d.provider === 'garmin' && d.isActive);
      if (garmin) return true;
    } catch {
      // Ignore polling errors
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  return false;
}
