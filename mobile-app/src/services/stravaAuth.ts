import * as WebBrowser from 'expo-web-browser';
import { apiRequest } from '../lib/api';

const STRAVA_REDIRECT_URI = 'aria://integrations/strava/callback';

/**
 * Initiates the full Strava OAuth flow:
 * 1. POST /api/integrations/connect to get auth URL
 * 2. Open browser for user authorization
 * 3. Handle callback with authorization code
 * 4. POST code to backend for token exchange
 */
export async function connectStrava(): Promise<boolean> {
  // Step 1: Get the auth URL from backend
  const { authUrl } = await apiRequest<{ authUrl: string }>('/api/integrations/connect', {
    method: 'POST',
    data: { provider: 'strava' },
  });

  if (!authUrl) {
    throw new Error('Failed to get Strava authorization URL');
  }

  // Step 2: Open browser for OAuth
  const result = await WebBrowser.openAuthSessionAsync(authUrl, STRAVA_REDIRECT_URI);

  if (result.type !== 'success' || !result.url) {
    return false; // User cancelled or dismissed
  }

  // Step 3: Extract code from callback URL
  return handleStravaCallback(result.url);
}

/**
 * Parses the Strava callback URL and sends the authorization code to the backend.
 */
export async function handleStravaCallback(url: string): Promise<boolean> {
  const parsedUrl = new URL(url);
  const code = parsedUrl.searchParams.get('code');

  if (!code) {
    throw new Error('No authorization code in Strava callback');
  }

  // Step 4: Send code to backend for token exchange
  await apiRequest('/api/integrations/strava/callback', {
    method: 'POST',
    data: { code },
  });

  return true;
}
