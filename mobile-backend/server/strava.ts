import { InsertWorkout } from '../shared/schema';
import { storage } from './storage';

export interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete: {
    id: number;
    firstname: string;
    lastname: string;
  };
}

export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sport_type: string;
  start_date: string;
  start_date_local: string;
  timezone: string;
  elapsed_time: number;
  moving_time: number;
  distance: number;
  total_elevation_gain: number;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_cadence?: number;
  calories?: number;
  description?: string;
  map?: {
    summary_polyline?: string;
  };
}

const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize';
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_API_BASE = 'https://www.strava.com/api/v3';
const STRAVA_REDIRECT_URI = 'aria://integrations/strava/callback';

export function getStravaAuthUrl(redirectUri?: string): string {
  const clientId = process.env.STRAVA_CLIENT_ID;
  if (!clientId) {
    throw new Error('STRAVA_CLIENT_ID is not configured');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri || STRAVA_REDIRECT_URI,
    scope: 'read,activity:read_all,profile:read_all',
    approval_prompt: 'auto',
  });

  return `${STRAVA_AUTH_URL}?${params.toString()}`;
}

export async function exchangeStravaCode(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  athleteId: string;
}> {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Strava credentials not configured');
  }

  const response = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Strava token exchange failed: ${error}`);
  }

  const data = await response.json() as StravaTokenResponse;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(data.expires_at * 1000),
    athleteId: String(data.athlete.id),
  };
}

export async function refreshStravaToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}> {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Strava credentials not configured');
  }

  const response = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Strava token refresh failed: ${error}`);
  }

  const data = await response.json() as StravaTokenResponse;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(data.expires_at * 1000),
  };
}

export async function getStravaActivities(
  accessToken: string,
  after?: number,
): Promise<StravaActivity[]> {
  const params = new URLSearchParams({ per_page: '50' });
  if (after) {
    params.set('after', String(after));
  }

  const response = await fetch(`${STRAVA_API_BASE}/athlete/activities?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Strava activities fetch failed: ${error}`);
  }

  return response.json() as Promise<StravaActivity[]>;
}

const STRAVA_TYPE_MAP: Record<string, string> = {
  Run: 'run',
  TrailRun: 'run',
  VirtualRun: 'run',
  Walk: 'walk',
  Ride: 'bike',
  VirtualRide: 'bike',
  Swim: 'swim',
  WeightTraining: 'strength',
  Workout: 'cross_training',
  CrossFit: 'cross_training',
  Yoga: 'cross_training',
};

export function mapStravaActivityToWorkout(
  activity: StravaActivity,
  userId: number,
): InsertWorkout {
  const type = STRAVA_TYPE_MAP[activity.type] || STRAVA_TYPE_MAP[activity.sport_type] || 'cross_training';

  let avgPace: string | undefined;
  if (activity.distance > 0 && activity.moving_time > 0 && (type === 'run' || type === 'walk')) {
    const paceSecsPerKm = activity.moving_time / (activity.distance / 1000);
    const mins = Math.floor(paceSecsPerKm / 60);
    const secs = Math.floor(paceSecsPerKm % 60);
    avgPace = `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  return {
    userId,
    providerSource: 'strava',
    externalId: String(activity.id),
    type,
    title: activity.name,
    description: activity.description || undefined,
    startTime: new Date(activity.start_date),
    endTime: new Date(new Date(activity.start_date).getTime() + activity.elapsed_time * 1000),
    timezone: activity.timezone,
    durationSeconds: activity.moving_time,
    distanceMeters: activity.distance,
    elevationGainMeters: activity.total_elevation_gain,
    avgPace,
    avgSpeed: activity.average_speed,
    maxSpeed: activity.max_speed,
    avgHeartRate: activity.average_heartrate,
    maxHeartRate: activity.max_heartrate,
    avgCadence: activity.average_cadence,
    calories: activity.calories,
  };
}

export async function syncStravaActivities(
  userId: number,
  accessToken: string,
  lastSyncAt?: Date | null,
): Promise<{ imported: number; skipped: number }> {
  // Fetch activities since last sync, or last 30 days
  const afterTimestamp = lastSyncAt
    ? Math.floor(new Date(lastSyncAt).getTime() / 1000)
    : Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);

  const activities = await getStravaActivities(accessToken, afterTimestamp);

  // Get existing workouts for dedup check
  const existingWorkouts = await storage.getWorkouts(userId, 200);
  const existingExternalIds = new Set(
    existingWorkouts
      .filter((w) => w.providerSource === 'strava' && w.externalId)
      .map((w) => w.externalId)
  );

  let imported = 0;
  let skipped = 0;

  for (const activity of activities) {
    const externalId = String(activity.id);
    if (existingExternalIds.has(externalId)) {
      skipped++;
      continue;
    }

    const workoutData = mapStravaActivityToWorkout(activity, userId);
    await storage.createWorkout(workoutData);
    existingExternalIds.add(externalId);
    imported++;
  }

  return { imported, skipped };
}
