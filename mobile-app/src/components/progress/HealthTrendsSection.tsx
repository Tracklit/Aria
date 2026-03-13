import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SparklineChart } from '../charts';
import { impactLight } from '../../utils/haptics';
import { useThemedStyles, useColors, spacing } from '../../theme';
import type { ThemeColors } from '../../theme/colors';
import { getHealthMetricsHistory } from '../../lib/api';

interface HealthMetric {
  date: string;
  sleepDurationSeconds?: number | null;
  hrvRmssd?: number | null;
  restingHeartRate?: number | null;
  vo2Max?: number | null;
  weightKg?: number | null;
}

interface TrendCardProps {
  title: string;
  data: number[];
  currentValue: string;
  color: string;
  metricKey: string;
  invertTrend?: boolean;
}

const TrendCard = React.memo(function TrendCard({
  title,
  data,
  currentValue,
  color,
  metricKey,
  invertTrend,
}: TrendCardProps) {
  const styles = useThemedStyles(createCardStyles);
  const colors = useColors();

  // Calculate trend direction
  const trend = data.length >= 2 ? data[data.length - 1] - data[0] : 0;
  const isImproving = invertTrend ? trend <= 0 : trend >= 0;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => {
        impactLight();
        router.push(`/health/${metricKey}`);
      }}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        <View style={styles.valueRow}>
          <Text style={[styles.cardValue, { color }]}>{currentValue}</Text>
          {data.length >= 2 && (
            <Ionicons
              name={trend >= 0 ? 'arrow-up' : 'arrow-down'}
              size={14}
              color={isImproving ? '#32D74B' : '#FF453A'}
            />
          )}
        </View>
      </View>
      <SparklineChart data={data} width={140} height={36} color={color} strokeWidth={2} />
      <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
    </TouchableOpacity>
  );
});

interface HealthTrendsSectionProps {
  hasHealthData: boolean;
}

const HealthTrendsSection = React.memo(function HealthTrendsSection({
  hasHealthData,
}: HealthTrendsSectionProps) {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadMetrics = useCallback(async () => {
    if (!hasHealthData) return;
    setIsLoading(true);
    try {
      const data = await getHealthMetricsHistory(14);
      if (Array.isArray(data)) {
        // Sort by date ascending for sparkline
        setMetrics(data.sort((a: HealthMetric, b: HealthMetric) => a.date.localeCompare(b.date)));
      }
    } catch (err) {
      console.warn('[HealthTrends] Failed to load metrics:', err);
    } finally {
      setIsLoading(false);
    }
  }, [hasHealthData]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  if (!hasHealthData) return null;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Health Trends</Text>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (metrics.length < 2) return null;

  const sleepData = metrics
    .filter((m) => m.sleepDurationSeconds != null)
    .map((m) => m.sleepDurationSeconds! / 3600);

  const hrvData = metrics
    .filter((m) => m.hrvRmssd != null)
    .map((m) => m.hrvRmssd!);

  const rhrData = metrics
    .filter((m) => m.restingHeartRate != null)
    .map((m) => m.restingHeartRate!);

  const vo2Data = metrics
    .filter((m) => m.vo2Max != null)
    .map((m) => m.vo2Max!);

  const weightData = metrics
    .filter((m) => m.weightKg != null)
    .map((m) => m.weightKg!);

  const hasSleep = sleepData.length >= 2;
  const hasHrv = hrvData.length >= 2;
  const hasRhr = rhrData.length >= 2;
  const hasVo2 = vo2Data.length >= 2;
  const hasWeight = weightData.length >= 2;

  if (!hasSleep && !hasHrv && !hasRhr && !hasVo2 && !hasWeight) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Health Trends</Text>

      {hasSleep && (
        <TrendCard
          title="Sleep Duration"
          data={sleepData}
          currentValue={`${sleepData[sleepData.length - 1].toFixed(1)}h`}
          color="#8E5CF5"
          metricKey="sleep"
        />
      )}

      {hasHrv && (
        <TrendCard
          title="HRV Trend"
          data={hrvData}
          currentValue={`${Math.round(hrvData[hrvData.length - 1])} ms`}
          color="#32D74B"
          metricKey="hrv"
        />
      )}

      {hasRhr && (
        <TrendCard
          title="Resting HR"
          data={rhrData}
          currentValue={`${Math.round(rhrData[rhrData.length - 1])} bpm`}
          color="#FF453A"
          metricKey="rhr"
          invertTrend
        />
      )}

      {hasVo2 && (
        <TrendCard
          title="VO2 Max"
          data={vo2Data}
          currentValue={`${vo2Data[vo2Data.length - 1].toFixed(1)}`}
          color="#00E5FF"
          metricKey="vo2max"
        />
      )}

      {hasWeight && (
        <TrendCard
          title="Weight"
          data={weightData}
          currentValue={`${weightData[weightData.length - 1].toFixed(1)} kg`}
          color="#FF9F0A"
          metricKey="weight"
        />
      )}
    </View>
  );
});

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: spacing.lg,
      marginTop: spacing.xl,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: spacing.md,
    },
    loadingWrap: {
      padding: spacing.lg,
      alignItems: 'center',
    },
  });

const createCardStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.background.cardSolid,
      borderRadius: 16,
      paddingVertical: spacing.md,
      paddingHorizontal: 20,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    cardHeader: {
      flex: 1,
      marginRight: 12,
    },
    cardTitle: {
      fontSize: 14,
      color: colors.text.primary,
      fontWeight: '600',
      marginBottom: 4,
    },
    cardValue: {
      fontSize: 18,
      fontWeight: '700',
    },
    valueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
  });

export default HealthTrendsSection;
