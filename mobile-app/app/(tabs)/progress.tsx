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

    return {
      miles: totalDistanceMeters / 1609.34,
      duration: formatDuration(totalDurationSeconds),
      avgPace: weekly.find((w) => w.avgPace)?.avgPace || "9'16\"",
      count: weekly.length,
    };
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
                d="M0,80 C40,70 60,30 100,50 C140,70 160,20 200,40 C240,60 260,10 300,30 L300,100 L0,100 Z"
              />
              <Path
                fill="none"
                stroke="#007AFF"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M0,80 C40,70 60,30 100,50 C140,70 160,20 200,40 C240,60 260,10 300,30"
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
              <View style={styles.bar} />
            </View>
            <View style={styles.advColRight}>
              <Text style={styles.advLabelRight}>Optimal</Text>
              <View style={[styles.bar, { width: '75%' }]} />
            </View>
          </View>

          <View style={styles.advRow}>
            <View style={styles.advCol}>
              <Text style={styles.advLabel}>VO2 Max</Text>
              <View style={[styles.bar, { width: '65%' }]} />
            </View>
            <View style={styles.advColRight}>
              <Text style={[styles.advLabelRight, styles.advLabelRightWhite]}>146 bpm</Text>
              <View style={[styles.bar, { width: '90%' }]} />
            </View>
          </View>

          <View style={styles.advRow}>
            <View style={styles.advCol}>
              <Text style={styles.advLabel}>Heart Rate</Text>
              <View style={[styles.bar, { width: '55%' }]} />
            </View>
            <View style={styles.advColRight}>
              <Text style={styles.advLabelRight}>{weeklyStats.count} workouts</Text>
              <View style={[styles.bar, { width: '52%' }]} />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    paddingBottom: 130,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 10,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: '500',
  },
  weeklySummary: {
    backgroundColor: '#111',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 24,
    marginTop: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
  },
  chartWrap: {
    marginTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  axisLabel: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statMain: {
    fontSize: 20,
    color: '#FFF',
    fontWeight: '700',
    marginBottom: 4,
  },
  statSub: {
    fontSize: 12,
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  advancedSection: {
    paddingHorizontal: 24,
    marginTop: 32,
  },
  advancedTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 16,
  },
  advRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 16,
    paddingVertical: 16,
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
    color: '#FFF',
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  advLabelRight: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  advLabelRightWhite: {
    color: '#FFF',
  },
  bar: {
    height: 8,
    borderRadius: 4,
    width: '80%',
    backgroundColor: '#007AFF',
  },
});
