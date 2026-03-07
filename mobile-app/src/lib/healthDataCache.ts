import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HealthMetricsPayload } from '../services/appleHealth';

const CACHE_KEY = 'health_cache_metrics';
const SYNC_TIME_KEY = 'health_cache_last_sync';

interface CachedHealthData {
  data: HealthMetricsPayload;
  cachedAt: string;
}

export async function cacheHealthMetrics(data: HealthMetricsPayload): Promise<void> {
  const cached: CachedHealthData = {
    data,
    cachedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  await AsyncStorage.setItem(SYNC_TIME_KEY, cached.cachedAt);
}

export async function getCachedHealthMetrics(): Promise<{ data: HealthMetricsPayload; cachedAt: Date } | null> {
  const raw = await AsyncStorage.getItem(CACHE_KEY);
  if (!raw) return null;

  try {
    const parsed: CachedHealthData = JSON.parse(raw);
    return {
      data: parsed.data,
      cachedAt: new Date(parsed.cachedAt),
    };
  } catch {
    return null;
  }
}

export async function clearHealthCache(): Promise<void> {
  await AsyncStorage.multiRemove([CACHE_KEY, SYNC_TIME_KEY]);
}

export async function getLastSyncTime(): Promise<Date | null> {
  const raw = await AsyncStorage.getItem(SYNC_TIME_KEY);
  if (!raw) return null;
  return new Date(raw);
}
