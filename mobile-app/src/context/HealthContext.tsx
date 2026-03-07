import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { Platform } from 'react-native';
import { apiRequest } from '../lib/api';
import { cacheHealthMetrics, getCachedHealthMetrics } from '../lib/healthDataCache';
import * as AppleHealth from '../services/appleHealth';
import { connectStrava } from '../services/stravaAuth';
import { registerBackgroundSync, unregisterBackgroundSync } from '../services/backgroundSync';
import { useAuth } from './AuthContext';

// ==================== Types ====================

export type IntegrationProvider = 'apple_health' | 'strava' | 'garmin';

export interface ConnectedDevice {
  id: number;
  userId: number;
  provider: IntegrationProvider;
  isActive: boolean;
  lastSyncAt?: string | null;
  syncPreferences?: {
    workouts: boolean;
    heartRate: boolean;
    sleep: boolean;
    recovery: boolean;
    bodyMetrics: boolean;
    steps: boolean;
  };
  createdAt: string;
}

export interface ReadinessData {
  score: number | null;
  factors?: string[];
  recommendation: string;
  date?: string;
}

interface HealthState {
  connectedDevices: ConnectedDevice[];
  healthMetrics: AppleHealth.HealthMetricsPayload | null;
  isSyncing: boolean;
  lastSyncAt: string | null;
  readiness: ReadinessData | null;
  isLoading: boolean;
  error: string | null;
}

interface HealthContextType extends HealthState {
  connectProvider: (provider: IntegrationProvider) => Promise<{ authUrl?: string; device?: ConnectedDevice }>;
  disconnectProvider: (provider: IntegrationProvider) => Promise<void>;
  syncHealthData: () => Promise<void>;
  getReadinessScore: () => Promise<ReadinessData | null>;
  refreshDevices: () => Promise<void>;
  isProviderConnected: (provider: IntegrationProvider) => boolean;
}

const HealthContext = createContext<HealthContextType | undefined>(undefined);

// ==================== Provider ====================

export const HealthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated, isDemoMode } = useAuth();

  const [state, setState] = useState<HealthState>({
    connectedDevices: [],
    healthMetrics: null,
    isSyncing: false,
    lastSyncAt: null,
    readiness: null,
    isLoading: false,
    error: null,
  });

  const refreshDevices = useCallback(async () => {
    if (!isAuthenticated || isDemoMode) return;
    try {
      const devices = await apiRequest<ConnectedDevice[]>('/api/integrations');
      setState((prev) => ({
        ...prev,
        connectedDevices: devices || [],
      }));
    } catch (err: any) {
      if (__DEV__) {
        console.warn('[Health] Failed to fetch devices:', err?.message);
      }
    }
  }, [isAuthenticated, isDemoMode]);

  const isProviderConnected = useCallback(
    (provider: IntegrationProvider) => {
      return state.connectedDevices.some((d) => d.provider === provider && d.isActive);
    },
    [state.connectedDevices]
  );

  const connectProvider = useCallback(
    async (provider: IntegrationProvider): Promise<{ authUrl?: string; device?: ConnectedDevice }> => {
      setState((prev) => ({ ...prev, error: null }));

      try {
        if (provider === 'apple_health') {
          if (Platform.OS !== 'ios') {
            setState((prev) => ({
              ...prev,
              error: 'Apple Health is only available on iOS',
            }));
            return {};
          }

          const available = await AppleHealth.isAvailable();
          if (!available) {
            setState((prev) => ({
              ...prev,
              error: 'HealthKit is not available on this device',
            }));
            return {};
          }

          const granted = await AppleHealth.requestPermissions();
          if (!granted) {
            setState((prev) => ({
              ...prev,
              error: 'HealthKit permissions were denied',
            }));
            return {};
          }

          // Register with backend
          const device = await apiRequest<ConnectedDevice>(
            '/api/integrations/connect',
            { method: 'POST', data: { provider: 'apple_health' } }
          );
          await refreshDevices();
          return { device };
        }

        if (provider === 'strava') {
          const success = await connectStrava();
          if (success) {
            await refreshDevices();
          }
          return {};
        }

        if (provider === 'garmin') {
          // Garmin data flows through Apple Health — just create a placeholder record
          const device = await apiRequest<ConnectedDevice>(
            '/api/integrations/connect',
            { method: 'POST', data: { provider: 'garmin' } }
          );
          await refreshDevices();
          return { device };
        }

        return {};
      } catch (err: any) {
        // 409 means already connected - refresh and treat as success
        if (err?.status === 409) {
          await refreshDevices();
          return {};
        }
        const msg = err?.message || 'Failed to connect provider';
        setState((prev) => ({ ...prev, error: msg }));
        throw err;
      }
    },
    [refreshDevices]
  );

  const disconnectProvider = useCallback(
    async (provider: IntegrationProvider) => {
      try {
        await apiRequest(`/api/integrations/${provider}`, { method: 'DELETE' });
        setState((prev) => ({
          ...prev,
          connectedDevices: prev.connectedDevices.filter((d) => d.provider !== provider),
        }));
      } catch (err: any) {
        const msg = err?.message || 'Failed to disconnect provider';
        setState((prev) => ({ ...prev, error: msg }));
        throw err;
      }
    },
    []
  );

  const syncHealthData = useCallback(async () => {
    if (state.isSyncing) return;
    setState((prev) => ({ ...prev, isSyncing: true, error: null }));

    try {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Aggregate metrics for today and yesterday
      const [todayMetrics, yesterdayMetrics] = await Promise.all([
        AppleHealth.aggregateHealthData(today),
        AppleHealth.aggregateHealthData(yesterday),
      ]);

      // Get workouts from the last 7 days
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const workouts = await AppleHealth.getWorkouts(weekAgo, today);

      // Send to backend
      const metrics = [todayMetrics, yesterdayMetrics].filter(
        (m) => m.sleepDurationSeconds || m.avgHeartRate || m.steps || m.weightKg
      );

      if (metrics.length > 0 || workouts.length > 0) {
        await AppleHealth.syncToBackend(metrics, workouts.length > 0 ? workouts : undefined);
      }

      // Cache locally for offline access
      await cacheHealthMetrics(todayMetrics);

      const syncTime = new Date().toISOString();
      setState((prev) => ({
        ...prev,
        healthMetrics: todayMetrics,
        lastSyncAt: syncTime,
        isSyncing: false,
      }));
    } catch (err: any) {
      if (__DEV__) {
        console.warn('[Health] Sync error:', err?.message);
      }
      // Fall back to cached data on failure
      const cached = await getCachedHealthMetrics();
      setState((prev) => ({
        ...prev,
        healthMetrics: cached?.data ?? prev.healthMetrics,
        lastSyncAt: cached ? cached.cachedAt.toISOString() : prev.lastSyncAt,
        isSyncing: false,
        error: err?.message || 'Sync failed',
      }));
    }
  }, [state.isSyncing]);

  const getReadinessScore = useCallback(async (): Promise<ReadinessData | null> => {
    try {
      const data = await apiRequest<ReadinessData>('/api/integrations/readiness');
      setState((prev) => ({ ...prev, readiness: data }));
      return data;
    } catch (err: any) {
      if (__DEV__) {
        console.warn('[Health] Readiness error:', err?.message);
      }
      return null;
    }
  }, []);

  // Fetch connected devices on auth
  useEffect(() => {
    if (isAuthenticated && !isDemoMode) {
      refreshDevices();
    }
  }, [isAuthenticated, isDemoMode, refreshDevices]);

  // Auto-sync Apple Health if connected
  useEffect(() => {
    if (!isAuthenticated || isDemoMode) return;
    if (Platform.OS !== 'ios') return;

    const appleHealthConnected = state.connectedDevices.some(
      (d) => d.provider === 'apple_health' && d.isActive
    );
    if (!appleHealthConnected) return;

    // Sync on mount, debounced
    const timer = setTimeout(() => {
      syncHealthData();
    }, 2000);

    return () => clearTimeout(timer);
  }, [isAuthenticated, isDemoMode, state.connectedDevices]);

  // Register/unregister background sync based on connected devices
  useEffect(() => {
    if (!isAuthenticated || isDemoMode) return;

    if (state.connectedDevices.some((d) => d.isActive)) {
      registerBackgroundSync();
    } else {
      unregisterBackgroundSync();
    }
  }, [isAuthenticated, isDemoMode, state.connectedDevices]);

  // Load cached health data on mount
  useEffect(() => {
    if (!isAuthenticated || isDemoMode) return;

    getCachedHealthMetrics().then((cached) => {
      if (cached) {
        setState((prev) => ({
          ...prev,
          healthMetrics: prev.healthMetrics ?? cached.data,
          lastSyncAt: prev.lastSyncAt ?? cached.cachedAt.toISOString(),
        }));
      }
    });
  }, [isAuthenticated, isDemoMode]);

  return (
    <HealthContext.Provider
      value={{
        ...state,
        connectProvider,
        disconnectProvider,
        syncHealthData,
        getReadinessScore,
        refreshDevices,
        isProviderConnected,
      }}
    >
      {children}
    </HealthContext.Provider>
  );
};

export const useHealth = () => {
  const context = useContext(HealthContext);
  if (!context) {
    throw new Error('useHealth must be used within a HealthProvider');
  }
  return context;
};
