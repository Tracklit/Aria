import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWorkout, useHealth, useDashboard } from '../../src/context';
import { useThemedStyles, useColors, spacing } from '../../src/theme';
import { ThemeColors } from '../../src/theme/colors';
import { WeeklySummaryCard, AdvancedAnalyticsCard, RecentWorkoutRow, HealthTrendsSection, CoachingInsightsBanner } from '../../src/components/progress';

function formatDuration(totalSeconds: number) {
  const minutes = Math.round(totalSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return { hours, mins };
}

function formatDurationStr(totalSeconds: number): string {
  const { hours, mins } = formatDuration(totalSeconds);
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
}

export default function ProgressScreen() {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const { workoutHistory, loadWorkoutHistory } = useWorkout();
  const { healthMetrics, connectedDevices } = useHealth();
  const { progressInsight, isProgressInsightLoading, loadProgressInsights } = useDashboard();
  const hasHealthData = connectedDevices.length > 0 && healthMetrics != null;

  useEffect(() => {
    loadWorkoutHistory(20);
    loadProgressInsights();
  }, [loadWorkoutHistory, loadProgressInsights]);

  const weeklyStats = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekly = workoutHistory.filter((w) => new Date(w.startTime) >= weekStart);
    const totalDistanceMeters = weekly.reduce((acc, w) => acc + (w.distanceMeters || 0), 0);
    const totalDurationSeconds = weekly.reduce((acc, w) => acc + (w.durationSeconds || 0), 0);

    const dailyDurations: number[] = [0, 0, 0, 0, 0, 0, 0];
    weekly.forEach((w) => {
      const day = new Date(w.startTime).getDay();
      dailyDurations[day] += w.durationSeconds || 0;
    });

    const pacedWorkouts = weekly.filter((w) => w.avgPace);
    const avgPaceDisplay =
      pacedWorkouts.length > 0 ? pacedWorkouts[pacedWorkouts.length - 1].avgPace! : '--';

    const hrWorkouts = weekly.filter((w) => w.avgHeartRate && w.avgHeartRate > 0);
    const avgHr =
      hrWorkouts.length > 0
        ? Math.round(hrWorkouts.reduce((acc, w) => acc + w.avgHeartRate!, 0) / hrWorkouts.length)
        : null;

    return {
      miles: totalDistanceMeters / 1609.34,
      duration: formatDuration(totalDurationSeconds),
      avgPace: avgPaceDisplay,
      count: weekly.length,
      dailyDurations,
      avgHr,
      totalDurationSeconds,
    };
  }, [workoutHistory]);

  const trainingLoadPercent = useMemo(
    () => Math.min(weeklyStats.totalDurationSeconds / (5 * 3600), 1) * 100,
    [weeklyStats.totalDurationSeconds],
  );

  const trainingLoadBadge = useMemo(() => {
    if (trainingLoadPercent >= 80) return 'Optimal';
    if (trainingLoadPercent >= 40) return 'Moderate';
    return 'Low';
  }, [trainingLoadPercent]);

  // Heart rate sparkline data from recent workouts
  const hrSparklineData = useMemo(() => {
    return workoutHistory
      .filter((w) => w.avgHeartRate && w.avgHeartRate > 0)
      .slice(0, 7)
      .reverse()
      .map((w) => w.avgHeartRate!);
  }, [workoutHistory]);

  // Workout frequency: per-day count over last 7 days
  const frequencyData = useMemo(() => {
    const now = new Date();
    const counts: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(now.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);
      counts.push(
        workoutHistory.filter((w) => {
          const t = new Date(w.startTime);
          return t >= dayStart && t < dayEnd;
        }).length,
      );
    }
    return counts;
  }, [workoutHistory]);

  const recentWorkouts = useMemo(() => {
    return workoutHistory.slice(0, 5).map((workout) => {
      const date = new Date(workout.startTime);
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return {
        id: workout.id,
        dateStr,
        title: workout.title || workout.type || 'Workout',
        duration: formatDurationStr(workout.durationSeconds || 0),
        type: workout.type,
      };
    });
  }, [workoutHistory]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* 1. Header */}
        <View style={styles.header}>
          <Text testID="progress.title" style={styles.title}>
            Progress
          </Text>
          <Text testID="progress.subtitle" style={styles.subtitle}>
            Analytics Dashboard
          </Text>
        </View>

        {/* 2. AI Coaching Insights Banner */}
        {(isProgressInsightLoading || progressInsight) && (
          <CoachingInsightsBanner
            type={progressInsight?.type ?? 'info'}
            summary={progressInsight?.summary ?? ''}
            details={progressInsight?.details ?? ''}
            isLoading={isProgressInsightLoading}
          />
        )}

        {/* 3. Weekly Summary */}
        <WeeklySummaryCard
          dailyDurations={weeklyStats.dailyDurations}
          miles={weeklyStats.miles}
          duration={weeklyStats.duration}
          avgPace={weeklyStats.avgPace}
        />

        {/* 4. Advanced Analytics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Advanced Analytics</Text>

          <AdvancedAnalyticsCard
            label="Training Load"
            sparklineData={weeklyStats.dailyDurations}
            value={`${Math.round(trainingLoadPercent)}%`}
            badge={trainingLoadBadge}
            progressPercent={trainingLoadPercent}
          />

          <AdvancedAnalyticsCard
            label="Heart Rate"
            sparklineData={hrSparklineData.length >= 2 ? hrSparklineData : [0, 0]}
            value={weeklyStats.avgHr ? `${weeklyStats.avgHr} bpm` : 'No HR data'}
            sparklineColor="#FF453A"
            progressPercent={weeklyStats.avgHr ? Math.min((weeklyStats.avgHr / 200) * 100, 100) : 0}
          />

          <AdvancedAnalyticsCard
            label="Workout Frequency"
            sparklineData={frequencyData}
            value={`${weeklyStats.count} this week`}
            sparklineColor="#32D74B"
            progressPercent={Math.min(weeklyStats.count / 7, 1) * 100}
          />
        </View>

        {/* 5. Health Trends */}
        <HealthTrendsSection hasHealthData={hasHealthData} />

        {/* 6. Recent Workouts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Workouts</Text>
          {recentWorkouts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No workouts yet</Text>
            </View>
          ) : (
            recentWorkouts.map((workout, index) => (
              <RecentWorkoutRow
                key={workout.id || index}
                dateStr={workout.dateStr}
                title={workout.title}
                duration={workout.duration}
                type={workout.type}
              />
            ))
          )}
        </View>
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
    content: {
      paddingBottom: 130,
    },
    header: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: 10,
    },
    title: {
      fontSize: 34,
      fontWeight: '700',
      color: colors.text.primary,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 18,
      color: colors.primary,
      fontWeight: '500',
    },
    section: {
      paddingHorizontal: spacing.lg,
      marginTop: spacing.xl,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: colors.text.primary,
      marginBottom: spacing.md,
    },
    emptyState: {
      backgroundColor: colors.background.cardSolid,
      borderRadius: 12,
      padding: spacing.lg,
      alignItems: 'center',
    },
    emptyText: {
      fontSize: 14,
      color: colors.text.secondary,
    },
  });
