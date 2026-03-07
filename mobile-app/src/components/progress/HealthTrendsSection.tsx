import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SparklineChart } from '../charts';
import { useThemedStyles, useColors, spacing } from '../../theme';
import type { ThemeColors } from '../../theme/colors';
import { getHealthMetricsHistory } from '../../lib/api';

interface HealthMetric {
  date: string;
  sleepDurationSeconds?: number | null;
  hrvRmssd?: number | null;
  restingHeartRate?: number | null;
  vo2Max?: number | null;
}

interface TrendCardProps {
  title: string;
  data: number[];
  currentValue: string;
  color: string;
}

const TrendCard = React.memo(function TrendCard({
  title,
  data,
  currentValue,
  color,
}: TrendCardProps) {
  const styles = useThemedStyles(createCardStyles);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={[styles.cardValue, { color }]}>{currentValue}</Text>
      </View>
      <SparklineChart data={data} width={120} height={30} color={color} strokeWidth={2} />
    </View>
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

  const hasSleep = sleepData.length >= 2;
  const hasHrv = hrvData.length >= 2;
  const hasRhr = rhrData.length >= 2;

  if (!hasSleep && !hasHrv && !hasRhr) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Health Trends</Text>

      {hasSleep && (
        <TrendCard
          title="Sleep Duration"
          data={sleepData}
          currentValue={`${sleepData[sleepData.length - 1].toFixed(1)}h`}
          color="#8E5CF5"
        />
      )}

      {hasHrv && (
        <TrendCard
          title="HRV Trend"
          data={hrvData}
          currentValue={`${Math.round(hrvData[hrvData.length - 1])} ms`}
          color="#32D74B"
        />
      )}

      {hasRhr && (
        <TrendCard
          title="Resting HR"
          data={rhrData}
          currentValue={`${Math.round(rhrData[rhrData.length - 1])} bpm`}
          color="#FF453A"
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
  });

export default HealthTrendsSection;
