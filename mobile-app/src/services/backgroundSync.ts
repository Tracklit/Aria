import { Platform } from 'react-native';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as AppleHealth from './appleHealth';
import { apiRequest } from '../lib/api';
import { cacheHealthMetrics } from '../lib/healthDataCache';
import { getToken } from '../lib/tokenStorage';

const TASK_NAME = 'HEALTH_DATA_SYNC';

// Define the background task
TaskManager.defineTask(TASK_NAME, async () => {
  try {
    // Verify we have an auth token
    const token = await getToken();
    if (!token) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // Get connected devices
    const devices = await apiRequest<any[]>('/api/integrations');
    if (!devices || devices.length === 0) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
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
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (err) {
    if (__DEV__) {
      console.error('[BackgroundSync] Task error:', err);
    }
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundSync(): Promise<void> {
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
