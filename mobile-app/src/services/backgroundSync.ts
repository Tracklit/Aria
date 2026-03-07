import { Platform } from 'react-native';

let BackgroundFetch: typeof import('expo-background-fetch') | null = null;
let TaskManager: typeof import('expo-task-manager') | null = null;

const TASK_NAME = 'HEALTH_DATA_SYNC';

// Lazy-load native modules to avoid crashes in Expo Go / dev client
// where these native modules may not be available
try {
  BackgroundFetch = require('expo-background-fetch');
  TaskManager = require('expo-task-manager');

  TaskManager.defineTask(TASK_NAME, async () => {
    try {
      const { getToken } = require('../lib/tokenStorage');
      const { apiRequest } = require('../lib/api');
      const AppleHealth = require('./appleHealth');
      const { cacheHealthMetrics } = require('../lib/healthDataCache');

      const token = await getToken();
      if (!token) {
        return BackgroundFetch!.BackgroundFetchResult.NoData;
      }

      const devices: any[] = await apiRequest('/api/integrations');
      if (!devices || devices.length === 0) {
        return BackgroundFetch!.BackgroundFetchResult.NoData;
      }

      let synced = false;

      // Apple Health sync
      const appleHealth = devices.find((d: any) => d.provider === 'apple_health' && d.isActive);
      if (appleHealth && Platform.OS === 'ios') {
        try {
          const today = new Date();
          const metrics = await AppleHealth.aggregateHealthData(today);

          const hasData = metrics.sleepDurationSeconds || metrics.avgHeartRate || metrics.steps || metrics.weightKg;
          if (hasData) {
            await AppleHealth.syncToBackend([metrics]);
            await cacheHealthMetrics(metrics);
            synced = true;
          }
        } catch (err) {
          if (__DEV__) {
            console.warn('[BackgroundSync] Apple Health sync error:', err);
          }
        }
      }

      // Strava sync
      const strava = devices.find((d: any) => d.provider === 'strava' && d.isActive);
      if (strava) {
        try {
          await apiRequest('/api/integrations/sync/strava', { method: 'POST' });
          synced = true;
        } catch (err) {
          if (__DEV__) {
            console.warn('[BackgroundSync] Strava sync error:', err);
          }
        }
      }

      // Garmin sync
      const garmin = devices.find((d: any) => d.provider === 'garmin' && d.isActive);
      if (garmin) {
        try {
          await apiRequest('/api/integrations/sync/garmin', { method: 'POST' });
          synced = true;
        } catch (err) {
          if (__DEV__) {
            console.warn('[BackgroundSync] Garmin sync error:', err);
          }
        }
      }

      return synced
        ? BackgroundFetch!.BackgroundFetchResult.NewData
        : BackgroundFetch!.BackgroundFetchResult.NoData;
    } catch (err) {
      if (__DEV__) {
        console.error('[BackgroundSync] Task error:', err);
      }
      return BackgroundFetch!.BackgroundFetchResult.Failed;
    }
  });
} catch (err) {
  if (__DEV__) {
    console.warn('[BackgroundSync] Native modules not available (expected in Expo Go):', (err as Error).message);
  }
}

export async function registerBackgroundSync(): Promise<void> {
  if (!BackgroundFetch || !TaskManager) {
    if (__DEV__) {
      console.warn('[BackgroundSync] Native modules not available, skipping registration');
    }
    return;
  }

  try {
    const status = await BackgroundFetch.getStatusAsync();
    if (status === BackgroundFetch.BackgroundFetchStatus.Denied) {
      if (__DEV__) {
        console.warn('[BackgroundSync] Background fetch denied by system');
      }
      return;
    }

    await BackgroundFetch.registerTaskAsync(TASK_NAME, {
      minimumInterval: 15 * 60, // 15 minutes minimum
      stopOnTerminate: false,
      startOnBoot: true,
    });

    if (__DEV__) {
      console.log('[BackgroundSync] Registered background sync task');
    }
  } catch (err) {
    if (__DEV__) {
      console.warn('[BackgroundSync] Registration failed:', err);
    }
  }
}

export async function unregisterBackgroundSync(): Promise<void> {
  if (!BackgroundFetch || !TaskManager) {
    return;
  }

  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(TASK_NAME);
      if (__DEV__) {
        console.log('[BackgroundSync] Unregistered background sync task');
      }
    }
  } catch (err) {
    if (__DEV__) {
      console.warn('[BackgroundSync] Unregister failed:', err);
    }
  }
}
