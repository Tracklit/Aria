import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useThemedStyles, useColors, spacing, borderRadius } from '../../src/theme';
import type { ThemeColors } from '../../src/theme/colors';
import { getHealthMetricsHistory } from '../../src/lib/api';

interface MetricConfig {
  title: string;
  unit: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  extractValue: (m: any) => number | null;
  formatValue: (v: number) => string;
}

const METRIC_CONFIGS: Record<string, MetricConfig> = {
  sleep: {
    title: 'Sleep Duration',
    unit: 'hours',
    icon: 'moon',
    color: '#8E5CF5',
    extractValue: (m) => (m.sleepDurationSeconds ? m.sleepDurationSeconds / 3600 : null),
    formatValue: (v) => `${Math.floor(v)}h ${Math.round((v % 1) * 60)}m`,
  },
  hrv: {
    title: 'Heart Rate Variability',
    unit: 'ms',
    icon: 'pulse',
    color: '#32D74B',
    extractValue: (m) => m.hrvRmssd ?? null,
    formatValue: (v) => `${Math.round(v)} ms`,
  },
  rhr: {
    title: 'Resting Heart Rate',
    unit: 'bpm',
    icon: 'heart',
    color: '#FF453A',
    extractValue: (m) => m.restingHeartRate ?? null,
    formatValue: (v) => `${Math.round(v)} bpm`,
  },
  vo2max: {
    title: 'VO2 Max',
    unit: 'ml/kg/min',
    icon: 'speedometer',
    color: '#00E5FF',
    extractValue: (m) => m.vo2Max ?? null,
    formatValue: (v) => `${v.toFixed(1)}`,
  },
  weight: {
    title: 'Weight',
    unit: 'kg',
    icon: 'scale',
    color: '#FF9F0A',
    extractValue: (m) => m.weightKg ?? null,
    formatValue: (v) => `${v.toFixed(1)} kg`,
  },
  bodyFat: {
    title: 'Body Fat',
    unit: '%',
    icon: 'body',
    color: '#FFD60A',
    extractValue: (m) => m.bodyFatPercentage ?? null,
    formatValue: (v) => `${v.toFixed(1)}%`,
  },
};

function AreaChart({
  data,
  color,
  width = 320,
  height = 180,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;

  const padding = 16;
  const usableW = width - padding * 2;
  const usableH = height - padding * 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => ({
    x: padding + (i / (data.length - 1)) * usableW,
    y: padding + usableH - ((v - min) / range) * usableH,
  }));

  let linePath = `M ${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    linePath += ` C ${cpx},${prev.y} ${cpx},${curr.y} ${curr.x},${curr.y}`;
  }

  const areaPath = `${linePath} L ${points[points.length - 1].x},${height} L ${points[0].x},${height} Z`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity="0.3" />
          <Stop offset="1" stopColor={color} stopOpacity="0.02" />
        </LinearGradient>
      </Defs>
      <Path d={areaPath} fill="url(#areaGrad)" />
      <Path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function HealthDetailScreen() {
  const { metric } = useLocalSearchParams<{ metric: string }>();
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const [rawMetrics, setRawMetrics] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const config = METRIC_CONFIGS[metric || ''];

  useEffect(() => {
    async function load() {
      try {
        const data = await getHealthMetricsHistory(30);
        if (Array.isArray(data)) {
          setRawMetrics(
            data.sort((a: any, b: any) => a.date.localeCompare(b.date))
          );
        }
      } catch (err) {
        console.warn('[HealthDetail] Failed to load:', err);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const dataPoints = useMemo(() => {
    if (!config) return [];
    return rawMetrics
      .map((m) => ({ date: m.date, value: config.extractValue(m) }))
      .filter(
        (d): d is { date: string; value: number } => d.value !== null
      );
  }, [rawMetrics, config]);

  const values = dataPoints.map((d) => d.value);
  const currentValue =
    values.length > 0 ? values[values.length - 1] : null;
  const avg =
    values.length > 0
      ? values.reduce((a, b) => a + b, 0) / values.length
      : null;
  const min = values.length > 0 ? Math.min(...values) : null;
  const max = values.length > 0 ? Math.max(...values) : null;

  // Trend: compare last 3 days avg to previous 3 days avg
  const trendPct = useMemo(() => {
    if (values.length < 6) return null;
    const recent =
      values.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const prior =
      values.slice(-6, -3).reduce((a, b) => a + b, 0) / 3;
    if (prior === 0) return null;
    return ((recent - prior) / prior) * 100;
  }, [values]);

  if (!config) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Unknown metric</Text>
      </SafeAreaView>
    );
  }

  const screenWidth = Dimensions.get('window').width;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={colors.text.primary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{config.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={config.color} />
          </View>
        ) : dataPoints.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons
              name={config.icon}
              size={48}
              color={colors.text.tertiary}
            />
            <Text style={styles.emptyText}>
              No {config.title.toLowerCase()} data available
            </Text>
          </View>
        ) : (
          <>
            {/* Current Value */}
            <View style={styles.currentSection}>
              <Ionicons name={config.icon} size={28} color={config.color} />
              <Text
                style={[styles.currentValue, { color: config.color }]}
              >
                {currentValue !== null
                  ? config.formatValue(currentValue)
                  : '--'}
              </Text>
              {trendPct !== null && (
                <View style={styles.trendBadge}>
                  <Ionicons
                    name={
                      trendPct >= 0 ? 'trending-up' : 'trending-down'
                    }
                    size={16}
                    color={
                      metric === 'rhr'
                        ? trendPct <= 0
                          ? colors.green
                          : colors.red
                        : trendPct >= 0
                          ? colors.green
                          : colors.red
                    }
                  />
                  <Text
                    style={[
                      styles.trendText,
                      {
                        color:
                          metric === 'rhr'
                            ? trendPct <= 0
                              ? colors.green
                              : colors.red
                            : trendPct >= 0
                              ? colors.green
                              : colors.red,
                      },
                    ]}
                  >
                    {Math.abs(trendPct).toFixed(1)}%
                  </Text>
                </View>
              )}
            </View>

            {/* Chart */}
            <View style={styles.chartContainer}>
              <AreaChart
                data={values}
                color={config.color}
                width={screenWidth - 48}
                height={200}
              />
              <View style={styles.chartLabels}>
                <Text style={styles.chartLabel}>
                  {dataPoints[0]?.date?.slice(5)}
                </Text>
                <Text style={styles.chartLabel}>
                  {dataPoints[dataPoints.length - 1]?.date?.slice(5)}
                </Text>
              </View>
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Average</Text>
                <Text style={styles.statValue}>
                  {avg !== null ? config.formatValue(avg) : '--'}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Min</Text>
                <Text style={styles.statValue}>
                  {min !== null ? config.formatValue(min) : '--'}
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Max</Text>
                <Text style={styles.statValue}>
                  {max !== null ? config.formatValue(max) : '--'}
                </Text>
              </View>
            </View>

            {/* Recent Values */}
            <Text style={styles.recentTitle}>Recent Values</Text>
            {dataPoints
              .slice(-7)
              .reverse()
              .map((d) => (
                <View key={d.date} style={styles.recentRow}>
                  <Text style={styles.recentDate}>
                    {new Date(d.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                  <Text
                    style={[styles.recentValue, { color: config.color }]}
                  >
                    {config.formatValue(d.value)}
                  </Text>
                </View>
              ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background.primary,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.primary,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: 100,
    },
    loadingWrap: {
      paddingTop: 100,
      alignItems: 'center',
    },
    emptyWrap: {
      paddingTop: 100,
      alignItems: 'center',
      gap: spacing.md,
    },
    emptyText: {
      color: colors.text.secondary,
      fontSize: 16,
    },
    errorText: {
      color: colors.red,
      fontSize: 16,
      textAlign: 'center',
      marginTop: 100,
    },
    currentSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginTop: spacing.lg,
      marginBottom: spacing.lg,
    },
    currentValue: {
      fontSize: 36,
      fontWeight: '700',
    },
    trendBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.background.cardSolid,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: borderRadius.sm,
    },
    trendText: {
      fontSize: 13,
      fontWeight: '600',
    },
    chartContainer: {
      backgroundColor: colors.background.cardSolid,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.lg,
    },
    chartLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.sm,
    },
    chartLabel: {
      fontSize: 11,
      color: colors.text.tertiary,
    },
    statsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.xl,
    },
    statItem: {
      flex: 1,
      backgroundColor: colors.background.cardSolid,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      alignItems: 'center',
    },
    statLabel: {
      fontSize: 12,
      color: colors.text.secondary,
      marginBottom: 4,
    },
    statValue: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text.primary,
    },
    recentTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: spacing.md,
    },
    recentRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.background.secondary,
    },
    recentDate: {
      fontSize: 14,
      color: colors.text.secondary,
    },
    recentValue: {
      fontSize: 16,
      fontWeight: '600',
    },
  });
