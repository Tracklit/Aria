import { Platform } from 'react-native';
import { apiRequest } from '../lib/api';

// HealthKit types - lazy import to avoid crash on Android
let AppleHealthKit: any = null;

function getHealthKit(): any {
  if (Platform.OS !== 'ios') return null;
  if (!AppleHealthKit) {
    try {
      AppleHealthKit = require('react-native-health').default;
    } catch {
      return null;
    }
  }
  return AppleHealthKit;
}

// ==================== Types ====================

export interface SleepData {
  startDate: string;
  endDate: string;
  value: string; // 'INBED', 'ASLEEP', 'AWAKE', 'CORE', 'DEEP', 'REM'
}

export interface HeartRateData {
  startDate: string;
  value: number;
}

export interface HRVData {
  startDate: string;
  value: number;
}

export interface HealthKitWorkout {
  externalId: string;
  type: string;
  title?: string;
  startTime: string;
  endTime?: string;
  durationSeconds?: number;
  distanceMeters?: number;
  elevationGainMeters?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  calories?: number;
}

export interface HealthMetricsPayload {
  date: string;
  sleepDurationSeconds?: number;
  sleepEfficiency?: number;
  deepSleepSeconds?: number;
  remSleepSeconds?: number;
  restingHeartRate?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  hrvRmssd?: number;
  weightKg?: number;
  bodyFatPercentage?: number;
  steps?: number;
  activeMinutes?: number;
  caloriesBurned?: number;
}

// ==================== HealthKit Permissions ====================

const HEALTHKIT_PERMISSIONS = {
  permissions: {
    read: [
      'HeartRate',
      'RestingHeartRate',
      'HeartRateVariabilitySDNN',
      'SleepAnalysis',
      'StepCount',
      'ActiveEnergyBurned',
      'BodyMass',
      'BodyFatPercentage',
      'Workout',
      'OxygenSaturation',
    ],
    write: ['Workout'],
  },
};

// ==================== Helper ====================

function promisify<T>(fn: (options: any, cb: (err: string, result: T) => void) => void, options: any): Promise<T> {
  return new Promise((resolve, reject) => {
    fn(options, (err: string, result: T) => {
      if (err) reject(new Error(err));
      else resolve(result);
    });
  });
}

// ==================== Public API ====================

export async function isAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  const hk = getHealthKit();
  if (!hk) return false;

  return new Promise((resolve) => {
    hk.isAvailable((err: string, available: boolean) => {
      resolve(!err && available);
    });
  });
}

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  const hk = getHealthKit();
  if (!hk) return false;

  return new Promise((resolve) => {
    hk.initHealthKit(HEALTHKIT_PERMISSIONS, (err: string) => {
      if (err) {
        console.warn('[AppleHealth] Permission denied:', err);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

export async function getSleepData(start: Date, end: Date): Promise<SleepData[]> {
  if (Platform.OS !== 'ios') return [];
  const hk = getHealthKit();
  if (!hk) return [];

  try {
    const results = await promisify<SleepData[]>(
      hk.getSleepSamples.bind(hk),
      { startDate: start.toISOString(), endDate: end.toISOString() }
    );
    return results || [];
  } catch (err) {
    console.warn('[AppleHealth] getSleepData error:', err);
    return [];
  }
}

export async function getHeartRateData(start: Date, end: Date): Promise<HeartRateData[]> {
  if (Platform.OS !== 'ios') return [];
  const hk = getHealthKit();
  if (!hk) return [];

  try {
    const results = await promisify<HeartRateData[]>(
      hk.getHeartRateSamples.bind(hk),
      {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        ascending: false,
        limit: 100,
      }
    );
    return results || [];
  } catch (err) {
    console.warn('[AppleHealth] getHeartRateData error:', err);
    return [];
  }
}

export async function getHRVData(start: Date, end: Date): Promise<HRVData[]> {
  if (Platform.OS !== 'ios') return [];
  const hk = getHealthKit();
  if (!hk) return [];

  try {
    const results = await promisify<HRVData[]>(
      hk.getHeartRateVariabilitySamples.bind(hk),
      {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        ascending: false,
        limit: 10,
      }
    );
    return results || [];
  } catch (err) {
    console.warn('[AppleHealth] getHRVData error:', err);
    return [];
  }
}

export async function getRestingHeartRate(date: Date): Promise<number | null> {
  if (Platform.OS !== 'ios') return null;
  const hk = getHealthKit();
  if (!hk) return null;

  try {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const results = await promisify<any[]>(
      hk.getRestingHeartRate.bind(hk),
      { startDate: start.toISOString(), endDate: end.toISOString() }
    );

    if (Array.isArray(results) && results.length > 0) {
      return results[0].value;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getWorkouts(start: Date, end: Date): Promise<HealthKitWorkout[]> {
  if (Platform.OS !== 'ios') return [];
  const hk = getHealthKit();
  if (!hk) return [];

  try {
    const results = await promisify<any[]>(
      hk.getSamples.bind(hk),
      {
        typeIdentifier: 'Workout',
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      }
    );

    return (results || []).map((w: any) => ({
      externalId: w.id || `ahk_${w.startDate}_${w.activityName}`,
      type: w.activityName || 'Unknown',
      title: w.activityName,
      startTime: w.startDate || w.start,
      endTime: w.endDate || w.end,
      durationSeconds: w.duration ? Math.round(w.duration * 60) : undefined,
      distanceMeters: w.distance ? Math.round(w.distance * 1000) : undefined,
      calories: w.calories ? Math.round(w.calories) : undefined,
    }));
  } catch (err) {
    console.warn('[AppleHealth] getWorkouts error:', err);
    return [];
  }
}

export async function getSteps(date: Date): Promise<number> {
  if (Platform.OS !== 'ios') return 0;
  const hk = getHealthKit();
  if (!hk) return 0;

  try {
    const result = await promisify<{ value: number }>(
      hk.getStepCount.bind(hk),
      { date: date.toISOString() }
    );
    return result?.value || 0;
  } catch {
    return 0;
  }
}

export async function getBodyMetrics(): Promise<{ weight?: number; bodyFat?: number }> {
  if (Platform.OS !== 'ios') return {};
  const hk = getHealthKit();
  if (!hk) return {};

  const result: { weight?: number; bodyFat?: number } = {};

  try {
    const weightResult = await promisify<{ value: number }>(
      hk.getLatestWeight.bind(hk),
      { unit: 'kg' }
    );
    if (weightResult?.value) result.weight = weightResult.value;
  } catch { /* ignore */ }

  try {
    const bfResult = await promisify<{ value: number }>(
      hk.getLatestBodyFatPercentage.bind(hk),
      {}
    );
    if (bfResult?.value) result.bodyFat = bfResult.value * 100; // HealthKit returns 0-1
  } catch { /* ignore */ }

  return result;
}

export async function aggregateHealthData(date: Date): Promise<HealthMetricsPayload> {
  const dateStr = date.toISOString().split('T')[0];
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  // Previous night's sleep: look back from 6am to previous day 6pm
  const sleepEnd = new Date(date);
  sleepEnd.setHours(12, 0, 0, 0);
  const sleepStart = new Date(date);
  sleepStart.setDate(sleepStart.getDate() - 1);
  sleepStart.setHours(18, 0, 0, 0);

  const [sleep, heartRate, hrv, restingHR, steps, body] = await Promise.all([
    getSleepData(sleepStart, sleepEnd),
    getHeartRateData(dayStart, dayEnd),
    getHRVData(dayStart, dayEnd),
    getRestingHeartRate(date),
    getSteps(date),
    getBodyMetrics(),
  ]);

  const payload: HealthMetricsPayload = { date: dateStr };

  // Sleep
  if (sleep.length > 0) {
    const asleepSamples = sleep.filter(
      (s) => s.value === 'ASLEEP' || s.value === 'CORE' || s.value === 'DEEP' || s.value === 'REM'
    );
    const deepSamples = sleep.filter((s) => s.value === 'DEEP');
    const remSamples = sleep.filter((s) => s.value === 'REM');

    const totalSleepMs = asleepSamples.reduce((sum, s) => {
      return sum + (new Date(s.endDate).getTime() - new Date(s.startDate).getTime());
    }, 0);
    payload.sleepDurationSeconds = Math.round(totalSleepMs / 1000);

    const deepMs = deepSamples.reduce((sum, s) => {
      return sum + (new Date(s.endDate).getTime() - new Date(s.startDate).getTime());
    }, 0);
    if (deepMs > 0) payload.deepSleepSeconds = Math.round(deepMs / 1000);

    const remMs = remSamples.reduce((sum, s) => {
      return sum + (new Date(s.endDate).getTime() - new Date(s.startDate).getTime());
    }, 0);
    if (remMs > 0) payload.remSleepSeconds = Math.round(remMs / 1000);

    // Sleep efficiency: time asleep / total time in bed
    const inBedSamples = sleep.filter((s) => s.value === 'INBED');
    if (inBedSamples.length > 0) {
      const totalInBedMs = inBedSamples.reduce((sum, s) => {
        return sum + (new Date(s.endDate).getTime() - new Date(s.startDate).getTime());
      }, 0);
      if (totalInBedMs > 0) {
        payload.sleepEfficiency = Math.round((totalSleepMs / totalInBedMs) * 100);
      }
    }
  }

  // Heart rate
  if (heartRate.length > 0) {
    const hrValues = heartRate.map((h) => h.value);
    payload.avgHeartRate = Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length);
    payload.maxHeartRate = Math.round(Math.max(...hrValues));
  }

  // HRV
  if (hrv.length > 0) {
    payload.hrvRmssd = Math.round(hrv[0].value * 10) / 10;
  }

  // Resting heart rate
  if (restingHR != null) {
    payload.restingHeartRate = Math.round(restingHR);
  }

  // Steps
  if (steps > 0) {
    payload.steps = steps;
  }

  // Body metrics
  if (body.weight) payload.weightKg = Math.round(body.weight * 10) / 10;
  if (body.bodyFat) payload.bodyFatPercentage = Math.round(body.bodyFat * 10) / 10;

  return payload;
}

export async function syncToBackend(metrics: HealthMetricsPayload[], workouts?: HealthKitWorkout[]): Promise<void> {
  await apiRequest('/api/integrations/apple-health/sync', {
    method: 'POST',
    data: { metrics, workouts },
  });
}
