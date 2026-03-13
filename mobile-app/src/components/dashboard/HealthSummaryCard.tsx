import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SparklineChart } from '../charts';
import { useColors, spacing, borderRadius } from '../../theme';
import { impactLight } from '../../utils/haptics';

interface HealthMetricsPayload {
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
  vo2Max?: number;
}

interface ReadinessData {
  score: number | null;
  factors?: string[];
  recommendation: string;
}

interface HealthSummaryCardProps {
  healthMetrics: HealthMetricsPayload | null;
  readiness: ReadinessData | null;
  healthHistory: HealthMetricsPayload[];
  hasHealthData: boolean;
}

function getReadinessColor(score: number): string {
  if (score >= 80) return '#32D74B';
  if (score >= 60) return '#FFD60A';
  return '#FF453A';
}

function getReadinessCaption(score: number): string {
  if (score >= 80) return 'Ready for high intensity';
  if (score >= 60) return 'Moderate training OK';
  return 'Focus on recovery';
}

function formatSleepDuration(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

const HealthSummaryCard = React.memo(function HealthSummaryCard({
  healthMetrics,
  readiness,
  healthHistory,
  hasHealthData,
}: HealthSummaryCardProps) {
  const colors = useColors();

  const hasReadiness = readiness?.score != null;
  const hasSleep = healthMetrics?.sleepDurationSeconds != null;
  const hasHRV = healthMetrics?.hrvRmssd != null;
  const hasRestingHR = healthMetrics?.restingHeartRate != null;
  const hasSteps = healthMetrics?.steps != null;

  const hrvHistory = useMemo(
    () =>
      healthHistory
        .map((h) => h.hrvRmssd)
        .filter((v): v is number => v != null),
    [healthHistory],
  );

  const restingHRHistory = useMemo(
    () =>
      healthHistory
        .map((h) => h.restingHeartRate)
        .filter((v): v is number => v != null),
    [healthHistory],
  );

  // Sleep segment widths as percentages
  const sleepSegments = useMemo(() => {
    if (!healthMetrics?.sleepDurationSeconds) return null;
    const total = healthMetrics.sleepDurationSeconds;
    const deep = healthMetrics.deepSleepSeconds ?? 0;
    const rem = healthMetrics.remSleepSeconds ?? 0;
    const light = Math.max(0, total - deep - rem);
    if (total <= 0) return null;
    return {
      deep: (deep / total) * 100,
      rem: (rem / total) * 100,
      light: (light / total) * 100,
    };
  }, [healthMetrics]);

  if (!hasHealthData || (!hasReadiness && !hasSleep && !hasHRV && !hasRestingHR)) {
    return null;
  }

  const handlePress = () => {
    impactLight();
    router.push('/(tabs)/progress');
  };

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
        Health & Recovery
      </Text>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handlePress}
        style={[styles.card, { backgroundColor: colors.background.cardSolid }]}
      >
        {/* Readiness gauge */}
        {hasReadiness && readiness.score != null && (
          <View style={styles.readinessSection}>
            <View style={styles.readinessRow}>
              <Ionicons
                name="shield-checkmark"
                size={22}
                color={getReadinessColor(readiness.score)}
              />
              <Text
                style={[
                  styles.readinessScore,
                  { color: getReadinessColor(readiness.score) },
                ]}
              >
                {readiness.score}
              </Text>
              <Text style={[styles.readinessLabel, { color: colors.text.secondary }]}>
                {getReadinessCaption(readiness.score)}
              </Text>
            </View>
            {readiness.factors && readiness.factors.length > 0 && (
              <Text
                style={[styles.readinessFactors, { color: colors.text.tertiary }]}
                numberOfLines={2}
              >
                {readiness.factors.join(' · ')}
              </Text>
            )}
          </View>
        )}

        {/* Metric tiles row */}
        {(hasSleep || hasHRV || hasRestingHR) && (
          <View style={styles.tilesRow}>
            {/* Sleep tile */}
            {hasSleep && healthMetrics?.sleepDurationSeconds != null && (
              <View
                style={[
                  styles.tile,
                  { backgroundColor: colors.background.card },
                ]}
              >
                <View style={styles.tileHeader}>
                  <Ionicons name="moon" size={14} color="#5C6BC0" />
                  <Text style={[styles.tileLabel, { color: colors.text.secondary }]}>
                    Sleep
                  </Text>
                </View>
                <Text style={[styles.tileValue, { color: colors.text.primary }]}>
                  {formatSleepDuration(healthMetrics.sleepDurationSeconds)}
                </Text>
                {healthMetrics.sleepEfficiency != null && (
                  <Text style={[styles.tileSubtext, { color: colors.text.tertiary }]}>
                    {Math.round(healthMetrics.sleepEfficiency)}% efficiency
                  </Text>
                )}
                {sleepSegments && (
                  <View style={styles.sleepBar}>
                    <View
                      style={[
                        styles.sleepSegment,
                        {
                          width: `${sleepSegments.deep}%`,
                          backgroundColor: '#5C6BC0',
                          borderTopLeftRadius: 3,
                          borderBottomLeftRadius: 3,
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.sleepSegment,
                        {
                          width: `${sleepSegments.rem}%`,
                          backgroundColor: colors.primaryMuted,
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.sleepSegment,
                        {
                          width: `${sleepSegments.light}%`,
                          backgroundColor: 'rgba(255,255,255,0.15)',
                          borderTopRightRadius: 3,
                          borderBottomRightRadius: 3,
                        },
                      ]}
                    />
                  </View>
                )}
              </View>
            )}

            {/* HRV tile */}
            {hasHRV && healthMetrics?.hrvRmssd != null && (
              <View
                style={[
                  styles.tile,
                  { backgroundColor: colors.background.card },
                ]}
              >
                <View style={styles.tileHeader}>
                  <Ionicons name="pulse" size={14} color={colors.primary} />
                  <Text style={[styles.tileLabel, { color: colors.text.secondary }]}>
                    HRV
                  </Text>
                </View>
                <Text style={[styles.tileValue, { color: colors.text.primary }]}>
                  {Math.round(healthMetrics.hrvRmssd)}
                </Text>
                <Text style={[styles.tileSubtext, { color: colors.text.tertiary }]}>
                  ms
                </Text>
                {hrvHistory.length >= 2 && (
                  <View style={styles.sparklineWrap}>
                    <SparklineChart
                      data={hrvHistory}
                      width={70}
                      height={24}
                      color={colors.primary}
                      strokeWidth={1.5}
                    />
                  </View>
                )}
              </View>
            )}

            {/* Resting HR tile */}
            {hasRestingHR && healthMetrics?.restingHeartRate != null && (
              <View
                style={[
                  styles.tile,
                  { backgroundColor: colors.background.card },
                ]}
              >
                <View style={styles.tileHeader}>
                  <Ionicons name="heart" size={14} color="#FF453A" />
                  <Text style={[styles.tileLabel, { color: colors.text.secondary }]}>
                    Resting HR
                  </Text>
                </View>
                <Text style={[styles.tileValue, { color: colors.text.primary }]}>
                  {healthMetrics.restingHeartRate}
                </Text>
                <Text style={[styles.tileSubtext, { color: colors.text.tertiary }]}>
                  bpm
                </Text>
                {restingHRHistory.length >= 2 && (
                  <View style={styles.sparklineWrap}>
                    <SparklineChart
                      data={restingHRHistory}
                      width={70}
                      height={24}
                      color="#FF453A"
                      strokeWidth={1.5}
                    />
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Steps footer */}
        {hasSteps && healthMetrics?.steps != null && (
          <View style={styles.stepsFooter}>
            <Ionicons name="footsteps-outline" size={13} color={colors.text.tertiary} />
            <Text style={[styles.stepsText, { color: colors.text.tertiary }]}>
              {healthMetrics.steps.toLocaleString()} steps today
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 24,
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  // Readiness
  readinessSection: {
    marginBottom: spacing.md,
  },
  readinessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  readinessScore: {
    fontSize: 32,
    fontWeight: '800',
  },
  readinessLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  readinessFactors: {
    fontSize: 12,
    marginTop: spacing.xs,
    lineHeight: 17,
  },
  // Tiles
  tilesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tile: {
    flex: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm + 2,
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  tileLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  tileValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  tileSubtext: {
    fontSize: 10,
    marginTop: -1,
  },
  sparklineWrap: {
    marginTop: 6,
  },
  // Sleep bar
  sleepBar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 6,
  },
  sleepSegment: {
    height: 6,
  },
  // Steps footer
  stepsFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm + 2,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  stepsText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default HealthSummaryCard;
