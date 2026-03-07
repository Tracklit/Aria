import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useHealth } from '../../src/context';
import { useThemedStyles, useColors, typography, spacing, borderRadius } from '../../src/theme';
import { ThemeColors } from '../../src/theme/colors';
import { impactLight } from '../../src/utils/haptics';
import type { IntegrationProvider } from '../../src/context/HealthContext';

const PROVIDERS: {
  id: IntegrationProvider;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
  platformRestriction?: 'ios';
}[] = [
  {
    id: 'apple_health',
    name: 'Apple Health',
    icon: 'heart-outline',
    description: 'Sleep, heart rate, HRV, workouts, steps',
    platformRestriction: 'ios',
  },
  {
    id: 'strava',
    name: 'Strava',
    icon: 'bicycle-outline',
    description: 'Workouts, activities, routes',
  },
  {
    id: 'garmin',
    name: 'Garmin',
    icon: 'watch-outline',
    description: 'Heart rate, sleep, recovery, workouts',
  },
];

export default function IntegrationsScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const { connectedDevices } = useHealth();

  const isConnected = (provider: IntegrationProvider) =>
    connectedDevices.some((d) => d.provider === provider && d.isActive);

  const getLastSync = (provider: IntegrationProvider) => {
    const device = connectedDevices.find((d) => d.provider === provider);
    if (!device?.lastSyncAt) return null;
    const date = new Date(device.lastSyncAt);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const filteredProviders = PROVIDERS.filter(
    (p) => !p.platformRestriction || Platform.OS === p.platformRestriction
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Health Integrations</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>
          Connect your devices to help Aria understand your body better
        </Text>

        {filteredProviders.map((provider) => {
          const connected = isConnected(provider.id);
          const lastSync = getLastSync(provider.id);

          return (
            <TouchableOpacity
              key={provider.id}
              style={styles.providerCard}
              activeOpacity={0.7}
              onPress={() => {
                impactLight();
                router.push(`/settings/integrations/${provider.id}` as any);
              }}
            >
              <View style={styles.providerLeft}>
                <View style={[styles.iconContainer, connected && styles.iconContainerConnected]}>
                  <Ionicons
                    name={provider.icon}
                    size={24}
                    color={connected ? colors.teal : colors.text.secondary}
                  />
                </View>
                <View style={styles.providerInfo}>
                  <Text style={styles.providerName}>{provider.name}</Text>
                  <Text style={styles.providerDescription}>{provider.description}</Text>
                  {connected && lastSync && (
                    <Text style={styles.lastSync}>Last sync: {lastSync}</Text>
                  )}
                </View>
              </View>
              <View style={styles.providerRight}>
                <View style={[styles.statusBadge, connected ? styles.statusConnected : styles.statusDisconnected]}>
                  <Text style={[styles.statusText, connected ? styles.statusTextConnected : styles.statusTextDisconnected]}>
                    {connected ? 'Connected' : 'Not Connected'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
              </View>
            </TouchableOpacity>
          );
        })}
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
  subtitle: {
    ...typography.caption,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  providerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  iconContainerConnected: {
    backgroundColor: 'rgba(0, 150, 136, 0.15)',
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  providerDescription: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  lastSync: {
    ...typography.caption,
    color: colors.teal,
    marginTop: 2,
    fontSize: 11,
  },
  providerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  statusConnected: {
    backgroundColor: 'rgba(0, 150, 136, 0.15)',
  },
  statusDisconnected: {
    backgroundColor: colors.background.secondary,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusTextConnected: {
    color: colors.teal,
  },
  statusTextDisconnected: {
    color: colors.text.secondary,
  },
});
