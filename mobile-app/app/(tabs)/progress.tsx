import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useWorkout } from '../../src/context';
import { colors, spacing } from '../../src/theme';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function formatDuration(totalSeconds: number) {
  const minutes = Math.round(totalSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return { hours, mins };
}

export default function ProgressScreen() {
  const { workoutHistory, loadWorkoutHistory } = useWorkout();

  useEffect(() => {
    loadWorkoutHistory(20);
  }, [loadWorkoutHistory]);

  const weeklyStats = useMemo(() => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekly = workoutHistory.filter((w) => new Date(w.startTime) >= weekStart);
    const totalDistanceMeters = weekly.reduce((acc, w) => acc + (w.distanceMeters || 0), 0);
    const totalDurationSeconds = weekly.reduce((acc, w) => acc + (w.durationSeconds || 0), 0);

    // Per-day duration data for the weekly chart (Sun=0 through Sat=6)
    const dailyDurations: number[] = [0, 0, 0, 0, 0, 0, 0];
    weekly.forEach((w) => {
      const day = new Date(w.startTime).getDay();
      dailyDurations[day] += (w.durationSeconds || 0);
    });

    // Average pace from the most recent workout that has pace data
    const pacedWorkouts = weekly.filter((w) => w.avgPace);
    const avgPaceDisplay = pacedWorkouts.length > 0
      ? pacedWorkouts[pacedWorkouts.length - 1].avgPace!
      : '--';

    // Average heart rate from workouts that report it
    const hrWorkouts = weekly.filter((w) => w.avgHeartRate && w.avgHeartRate > 0);
    const avgHr = hrWorkouts.length > 0
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

  // Build a data-driven SVG path from daily durations
  const weeklyChartPath = useMemo(() => {
    const vals = weeklyStats.dailyDurations;
    const maxVal = Math.max(...vals, 1);
    const points = vals.map((v, i) => ({
      x: (i / 6) * 300,
      y: 100 - (v / maxVal) * 80 - 10,
    }));
    if (maxVal <= 1) {
      return { line: 'M0,90 L300,90', area: 'M0,90 L300,90 L300,100 L0,100 Z' };
    }
    const lineSegments = points.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');
    const areaPath = `${lineSegments} L300,100 L0,100 Z`;
    return { line: lineSegments, area: areaPath };
  }, [weeklyStats.dailyDurations]);

  // Training load: ratio of this week's total duration to a target of 5 hours/week
  const trainingLoadPercent = useMemo(
    () => Math.min(weeklyStats.totalDurationSeconds / (5 * 3600), 1) * 100,
    [weeklyStats.totalDurationSeconds],
  );

  // Training load sparkline: per-day duration normalized as mini chart
  const trainingLoadPath = useMemo(() => {
    const vals = weeklyStats.dailyDurations;
    const maxVal = Math.max(...vals, 1);
    const points = vals.map((v, i) => ({
      x: (i / 6) * 100,
      y: 28 - (v / maxVal) * 24 - 2,
    }));
    if (maxVal <= 1) return 'M0,28 L100,28';
    return points.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(' ');
  }, [weeklyStats.dailyDurations]);

  // Heart rate sparkline from recent workouts that have HR data
  const hrSparklinePath = useMemo(() => {
    const hrWorkouts = workoutHistory
      .filter((w) => w.avgHeartRate && w.avgHeartRate > 0)
      .slice(0, 7)
      .reverse();
    if (hrWorkouts.length < 2) return 'M0,15 L100,15';
    const hrs = hrWorkouts.map((w) => w.avgHeartRate!);
    const minHr = Math.min(...hrs);
    const maxHr = Math.max(...hrs, minHr + 1);
    return hrWorkouts.map((w, i) => {
      const x = (i / (hrWorkouts.length - 1)) * 100;
      const y = 28 - ((w.avgHeartRate! - minHr) / (maxHr - minHr)) * 24 - 2;
      return i === 0 ? `M${x},${y}` : `L${x},${y}`;
    }).join(' ');
  }, [workoutHistory]);

  // Workout frequency sparkline: per-day workout count over last 7 days
  const frequencyPath = useMemo(() => {
    const now = new Date();
    const counts: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(now.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayStart.getDate() + 1);
      counts.push(workoutHistory.filter((w) => {
        const t = new Date(w.startTime);
        return t >= dayStart && t < dayEnd;
      }).length);
    }
    const maxC = Math.max(...counts, 1);
    return counts.map((c, i) => {
      const x = (i / 6) * 100;
      const y = 28 - (c / maxC) * 24 - 2;
      return i === 0 ? `M${x},${y}` : `L${x},${y}`;
    }).join(' ');
  }, [workoutHistory]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text testID="progress.title" style={styles.title}>Progress</Text>
          <Text testID="progress.subtitle" style={styles.subtitle}>Analytics Dashboard</Text>
        </View>

        <View style={styles.weeklySummary}>
          <Text testID="progress.weekly_summary" style={styles.cardTitle}>Weekly Summary</Text>

          <View style={styles.chartWrap}>
            <Svg width="100%" height={110} viewBox="0 0 300 100" preserveAspectRatio="none">
              <Defs>
                <LinearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor="rgba(0, 122, 255, 0.4)" />
                  <Stop offset="100%" stopColor="rgba(0, 122, 255, 0)" />
                </LinearGradient>
              </Defs>
              <Path
                fill="url(#chartGradient)"
                d={weeklyChartPath.area}
              />
              <Path
                fill="none"
                stroke="#007AFF"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                d={weeklyChartPath.line}
              />
            </Svg>
          </View>

          <View style={styles.axisRow}>
            {DAY_LABELS.map((d, idx) => (
              <Text key={`${d}-${idx}`} style={styles.axisLabel}>
                {d}
              </Text>
            ))}
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statMain}>{weeklyStats.miles.toFixed(1)} mi</Text>
              <Text style={styles.statSub}>Distance</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statMain}>
                {weeklyStats.duration.hours}h {weeklyStats.duration.mins}m
              </Text>
              <Text style={styles.statSub}>Duration</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statMain}>{weeklyStats.avgPace}</Text>
              <Text style={styles.statSub}>Avg. Pace</Text>
            </View>
          </View>
        </View>

        <View style={styles.advancedSection}>
          <Text style={styles.advancedTitle}>Advanced Analytics</Text>

          <View style={styles.advRow}>
            <View style={styles.advCol}>
              <Text style={styles.advLabel}>Training Load</Text>
              <Svg height={30} width="100%" viewBox="0 0 100 30" preserveAspectRatio="none">
                <Path fill="none" stroke="#007AFF" strokeWidth={2} d={trainingLoadPath} />
              </Svg>
            </View>
            <View style={styles.advColRight}>
              <Text style={styles.advLabelRight}>
                {trainingLoadPercent >= 80 ? 'Optimal' : trainingLoadPercent >= 40 ? 'Moderate' : 'Low'}
              </Text>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${Math.round(trainingLoadPercent)}%` }]} />
              </View>
            </View>
          </View>

          <View style={styles.advRow}>
            <View style={styles.advCol}>
              <Text style={styles.advLabel}>Heart Rate</Text>
              <Svg height={30} width="100%" viewBox="0 0 100 30" preserveAspectRatio="none">
                <Path fill="none" stroke="#007AFF" strokeWidth={2} d={hrSparklinePath} />
              </Svg>
            </View>
            <View style={styles.advColRight}>
              <Text style={[styles.advLabelRight, styles.advLabelRightWhite]}>
                {weeklyStats.avgHr ? `${weeklyStats.avgHr} bpm` : 'No HR data'}
              </Text>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: weeklyStats.avgHr ? `${Math.min((weeklyStats.avgHr / 200) * 100, 100)}%` : '0%' }]} />
              </View>
            </View>
          </View>

          <View style={styles.advRow}>
            <View style={styles.advCol}>
              <Text style={styles.advLabel}>Workout Frequency</Text>
              <Svg height={30} width="100%" viewBox="0 0 100 30" preserveAspectRatio="none">
                <Path fill="none" stroke="#007AFF" strokeWidth={2} d={frequencyPath} />
              </Svg>
            </View>
            <View style={styles.advColRight}>
              <Text style={[styles.advLabelRight, styles.advLabelRightWhite]}>
                {weeklyStats.count} this week
              </Text>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${Math.min(weeklyStats.count / 7, 1) * 100}%` }]} />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.recentSection}>
          <Text style={styles.advancedTitle}>Recent Workouts</Text>
          {workoutHistory.slice(0, 5).length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No workouts yet</Text>
            </View>
          ) : (
            workoutHistory.slice(0, 5).map((workout, index) => {
              const date = new Date(workout.startTime);
              const dateStr = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              });
              const dur = formatDuration(workout.durationSeconds || 0);
              return (
                <View key={workout.id || index} style={styles.workoutRow}>
                  <View style={styles.workoutDate}>
                    <Text style={styles.workoutDateText}>{dateStr}</Text>
                  </View>
                  <View style={styles.workoutInfo}>
                    <Text style={styles.workoutTitle} numberOfLines={1}>
                      {workout.title || workout.type || 'Workout'}
                    </Text>
                  </View>
                  <Text style={styles.workoutDuration}>
                    {dur.hours > 0 ? `${dur.hours}h ` : ''}{dur.mins}m
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  weeklySummary: {
    backgroundColor: colors.background.cardSolid,
    borderRadius: 20,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
  },
  chartWrap: {
    marginTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.background.secondary,
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  axisLabel: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statMain: {
    fontSize: 20,
    color: colors.text.primary,
    fontWeight: '700',
    marginBottom: 4,
  },
  statSub: {
    fontSize: 12,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  advancedSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  advancedTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  advRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.background.cardSolid,
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  advCol: {
    width: '45%',
  },
  advColRight: {
    width: '45%',
    alignItems: 'flex-end',
  },
  advLabel: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  advLabelRight: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  advLabelRightWhite: {
    color: colors.text.primary,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    width: '80%',
    backgroundColor: colors.background.secondary,
    alignSelf: 'flex-end',
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  recentSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.cardSolid,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  workoutDate: {
    width: 56,
  },
  workoutDateText: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  workoutInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
  workoutTitle: {
    fontSize: 15,
    color: colors.text.primary,
    fontWeight: '600',
  },
  workoutDuration: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
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
