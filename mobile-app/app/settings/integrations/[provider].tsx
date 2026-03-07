import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useHealth } from '../../../src/context';
import { apiRequest } from '../../../src/lib/api';
import { useThemedStyles, useColors, typography, spacing, borderRadius } from '../../../src/theme';
import { ThemeColors } from '../../../src/theme/colors';
import { impactLight, selectionChanged, notificationSuccess, notificationWarning } from '../../../src/utils/haptics';
import { ToastManager } from '../../../src/components/Toast';
import type { IntegrationProvider } from '../../../src/context/HealthContext';

const PROVIDER_META: Record<string, {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}> = {
  apple_health: { name: 'Apple Health', icon: 'heart', color: '#FF2D55' },
  strava: { name: 'Strava', icon: 'bicycle', color: '#FC4C02' },
  garmin: { name: 'Garmin', icon: 'watch', color: '#007CC3' },
};

const DATA_EXPLANATIONS = [
  {
    key: 'sleep',
    icon: 'moon-outline' as const,
    title: 'Sleep',
    description: 'Sleep data helps Aria adjust training intensity based on your recovery',
  },
  {
    key: 'heartRate',
    icon: 'heart-outline' as const,
    title: 'Heart Rate',
    description: 'Heart rate data helps Aria monitor your cardiovascular fitness trends',
  },
  {
    key: 'recovery',
    icon: 'pulse-outline' as const,
    title: 'HRV & Recovery',
    description: 'HRV data helps Aria detect overtraining before you feel it',
  },
  {
    key: 'steps',
    icon: 'footsteps-outline' as const,
    title: 'Steps & Activity',
    description: 'Activity data helps Aria understand your overall training load',
  },
  {
    key: 'bodyMetrics',
    icon: 'body-outline' as const,
    title: 'Body Metrics',
    description: 'Weight trends help Aria optimize your nutrition recommendations',
  },
  {
    key: 'workouts',
    icon: 'barbell-outline' as const,
    title: 'Workouts',
    description: 'Workout data gives Aria a complete picture of your training volume',
  },
];

const DEFAULT_PREFS = {
  workouts: true,
  heartRate: true,
  sleep: true,
  recovery: true,
  bodyMetrics: true,
  steps: true,
};

type SyncPrefKey = keyof typeof DEFAULT_PREFS;

export default function ProviderDetailScreen() {
  const { provider: providerParam } = useLocalSearchParams<{ provider: string }>();
  const provider = providerParam as IntegrationProvider;
  const meta = PROVIDER_META[provider] || { name: provider, icon: 'link-outline', color: '#888' };

  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const {
    connectedDevices,
    connectProvider,
    disconnectProvider,
    syncHealthData,
    isSyncing,
    error,
  } = useHealth();

  const device = connectedDevices.find((d) => d.provider === provider);
  const connected = device?.isActive ?? false;
  const [isConnecting, setIsConnecting] = useState(false);
  const [prefs, setPrefs] = useState<Record<SyncPrefKey, boolean>>({
    ...DEFAULT_PREFS,
    ...(device as any)?.syncPreferences,
  });

  const handleConnect = useCallback(async () => {
    if (provider === 'apple_health' && Platform.OS !== 'ios') {
      Alert.alert('Not Available', 'Apple Health is only available on iOS devices.');
      return;
    }

    setIsConnecting(true);
    try {
      await connectProvider(provider);
      notificationSuccess();
      ToastManager.success(`${meta.name} connected successfully`);
    } catch (err: any) {
      if (err?.status !== 409) {
        ToastManager.error(err?.message || `Failed to connect ${meta.name}`);
      }
    } finally {
      setIsConnecting(false);
    }
  }, [provider, connectProvider, meta.name]);

  const handleDisconnect = useCallback(() => {
    notificationWarning();
    Alert.alert(
      `Disconnect ${meta.name}`,
      `This will stop syncing data from ${meta.name}. Your existing data will be preserved.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              await disconnectProvider(provider);
              ToastManager.success(`${meta.name} disconnected`);
            } catch {
              ToastManager.error(`Failed to disconnect ${meta.name}`);
            }
          },
        },
      ]
    );
  }, [provider, disconnectProvider, meta.name]);

  const handleSync = useCallback(async () => {
    impactLight();
    try {
      if (provider === 'apple_health') {
        await syncHealthData();
      } else {
        await apiRequest(`/api/integrations/sync/${provider}`, { method: 'POST' });
      }
      notificationSuccess();
      ToastManager.success('Sync complete');
    } catch {
      ToastManager.error('Sync failed. Please try again.');
    }
  }, [provider, syncHealthData]);

  const handleTogglePref = useCallback(async (key: SyncPrefKey, value: boolean) => {
    selectionChanged();
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    try {
      await apiRequest(`/api/integrations/${provider}/preferences`, {
        method: 'PATCH',
        data: { [key]: value },
      });
    } catch {
      setPrefs((prev) => ({ ...prev, [key]: !value }));
    }
  }, [prefs, provider]);

  const lastSyncDisplay = device?.lastSyncAt
    ? new Date(device.lastSyncAt).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      })
    : 'Never';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{meta.name}</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Provider Header */}
        <View style={styles.providerHeader}>
          <View style={[styles.largeIcon, { backgroundColor: meta.color + '20' }]}>
            <Ionicons name={meta.icon} size={36} color={meta.color} />
          </View>
          <View style={[
            styles.statusIndicator,
            connected ? styles.statusIndicatorConnected : styles.statusIndicatorDisconnected,
          ]}>
            <View style={[styles.statusDot, connected ? styles.dotConnected : styles.dotDisconnected]} />
            <Text style={[styles.statusLabel, connected ? styles.statusLabelConnected : styles.statusLabelDisconnected]}>
              {connected ? 'Connected' : 'Not Connected'}
            </Text>
          </View>
        </View>

        {/* Connect / Disconnect Button */}
        {!connected ? (
          <TouchableOpacity
            style={styles.connectButton}
            onPress={handleConnect}
            disabled={isConnecting}
            activeOpacity={0.8}
          >
            {isConnecting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="link-outline" size={20} color="#fff" />
                <Text style={styles.connectButtonText}>Connect {meta.name}</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <>
            {/* Sync Section */}
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="sync-outline" size={14} color={colors.text.secondary} />
              <Text style={styles.sectionHeader}>SYNC</Text>
              <View style={styles.sectionLine} />
            </View>
            <View style={styles.card}>
              <View style={styles.syncRow}>
                <View>
                  <Text style={styles.syncLabel}>Last Sync</Text>
                  <Text style={styles.syncValue}>{lastSyncDisplay}</Text>
                </View>
                <TouchableOpacity
                  style={styles.syncButton}
                  onPress={handleSync}
                  disabled={isSyncing}
                  activeOpacity={0.8}
                >
                  {isSyncing ? (
                    <ActivityIndicator size="small" color={colors.teal} />
                  ) : (
                    <>
                      <Ionicons name="refresh-outline" size={16} color={colors.teal} />
                      <Text style={styles.syncButtonText}>Sync Now</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Data Permissions */}
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="shield-checkmark-outline" size={14} color={colors.text.secondary} />
              <Text style={styles.sectionHeader}>DATA PERMISSIONS</Text>
              <View style={styles.sectionLine} />
            </View>
            <View style={styles.card}>
              {DATA_EXPLANATIONS.map((item, index) => (
                <React.Fragment key={item.key}>
                  {index > 0 && <View style={styles.divider} />}
                  <View style={styles.permissionRow}>
                    <View style={styles.permissionLeft}>
                      <Ionicons name={item.icon} size={18} color={colors.text.secondary} style={{ marginRight: spacing.sm }} />
                      <View style={styles.permissionInfo}>
                        <Text style={styles.permissionTitle}>{item.title}</Text>
                        <Text style={styles.permissionDescription}>{item.description}</Text>
                      </View>
                    </View>
                    <Switch
                      value={prefs[item.key as SyncPrefKey]}
                      onValueChange={(val) => handleTogglePref(item.key as SyncPrefKey, val)}
                      trackColor={{ false: colors.background.secondary, true: colors.teal }}
                      thumbColor="#fff"
                    />
                  </View>
                </React.Fragment>
              ))}
            </View>

            {/* Disconnect */}
            <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnect} activeOpacity={0.8}>
              <Ionicons name="unlink-outline" size={18} color={colors.red} />
              <Text style={styles.disconnectText}>Disconnect {meta.name}</Text>
            </TouchableOpacity>
          </>
        )}

        {/* How This Helps Section (always visible) */}
        {!connected && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="information-circle-outline" size={14} color={colors.text.secondary} />
              <Text style={styles.sectionHeader}>HOW THIS HELPS ARIA</Text>
              <View style={styles.sectionLine} />
            </View>
            <View style={styles.card}>
              {DATA_EXPLANATIONS.map((item, index) => (
                <React.Fragment key={item.key}>
                  {index > 0 && <View style={styles.divider} />}
                  <View style={styles.explanationRow}>
                    <Ionicons name={item.icon} size={18} color={colors.teal} style={{ marginRight: spacing.sm, marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.explanationTitle}>{item.title}</Text>
                      <Text style={styles.explanationDescription}>{item.description}</Text>
                    </View>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </>
        )}

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: { ...typography.body, color: colors.text.primary, fontWeight: '600' },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 120, gap: spacing.md },
  providerHeader: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  largeIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  statusIndicatorConnected: {
    backgroundColor: 'rgba(0, 150, 136, 0.15)',
  },
  statusIndicatorDisconnected: {
    backgroundColor: colors.background.secondary,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotConnected: { backgroundColor: colors.teal },
  dotDisconnected: { backgroundColor: colors.text.secondary },
  statusLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusLabelConnected: { color: colors.teal },
  statusLabelDisconnected: { color: colors.text.secondary },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.teal,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  connectButtonText: {
    ...typography.body,
    color: '#fff',
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  sectionHeader: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.background.secondary,
    marginLeft: spacing.sm,
  },
  card: {
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  syncLabel: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  syncValue: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(0, 150, 136, 0.15)',
  },
  syncButtonText: {
    ...typography.caption,
    color: colors.teal,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.background.secondary,
    marginVertical: spacing.xs,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  permissionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.md,
  },
  permissionInfo: { flex: 1 },
  permissionTitle: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  permissionDescription: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 1,
    fontSize: 11,
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.red,
    marginTop: spacing.sm,
  },
  disconnectText: {
    ...typography.body,
    color: colors.red,
    fontWeight: '600',
  },
  explanationRow: {
    flexDirection: 'row',
    paddingVertical: spacing.xs,
  },
  explanationTitle: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  explanationDescription: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 1,
    fontSize: 11,
    lineHeight: 16,
  },
  errorText: {
    ...typography.caption,
    color: colors.red,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
