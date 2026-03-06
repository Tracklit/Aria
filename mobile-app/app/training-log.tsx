import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles, useColors, typography, spacing, borderRadius } from '../src/theme';
import { ThemeColors } from '../src/theme/colors';
import { getWorkouts } from '../src/lib/api';

interface WorkoutEntry {
  id: number;
  type: string;
  title: string | null;
  startTime: string;
  endTime: string | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  avgHeartRate: number | null;
  calories: number | null;
  notes: string | null;
  splits: Array<{
    exerciseName?: string;
    repTimes?: number[];
    distance?: number;
    duration?: number;
    pace?: string;
    notes?: string;
  }> | null;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Unknown date';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(dateString: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '--';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${secs}s`;
}

export default function TrainingLogScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function fetchWorkouts() {
        try {
          setLoading(true);
          const data = await getWorkouts();
          if (!cancelled) setWorkouts(data || []);
        } catch (err: any) {
          if (!cancelled) setError(err.message || 'Failed to load workouts');
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
      fetchWorkouts();
      return () => { cancelled = true; };
    }, [])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Training Log</Text>
        <View style={styles.backButton} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.text.tertiary} />
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : workouts.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="journal-outline" size={48} color={colors.text.tertiary} />
          <Text style={styles.emptyTitle}>No workouts logged yet</Text>
          <Text style={styles.emptyText}>
            Your logged workouts will appear here.
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {workouts.map((workout) => (
            <View key={workout.id} style={styles.sessionCard}>
              <View style={styles.sessionHeader}>
                <View style={styles.sessionIcon}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.green} />
                </View>
                <View style={styles.sessionInfo}>
                  <Text style={styles.sessionTitle}>
                    {workout.title || 'Training Session'}
                  </Text>
                  <Text style={styles.sessionDate}>
                    {formatDate(workout.startTime)}
                    {` at ${formatTime(workout.startTime)}`}
                  </Text>
                </View>
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metric}>
                  <Ionicons name="time-outline" size={14} color={colors.text.secondary} />
                  <Text style={styles.metricValue}>
                    {formatDuration(workout.durationSeconds)}
                  </Text>
                </View>
                {workout.distanceMeters != null && workout.distanceMeters > 0 && (
                  <View style={styles.metric}>
                    <Ionicons name="navigate-outline" size={14} color={colors.text.secondary} />
                    <Text style={styles.metricValue}>
                      {(workout.distanceMeters / 1000).toFixed(2)} km
                    </Text>
                  </View>
                )}
                {workout.avgHeartRate != null && workout.avgHeartRate > 0 && (
                  <View style={styles.metric}>
                    <Ionicons name="heart-outline" size={14} color={colors.text.secondary} />
                    <Text style={styles.metricValue}>
                      {workout.avgHeartRate} bpm
                    </Text>
                  </View>
                )}
                {workout.splits && workout.splits.length > 0 && (
                  <View style={styles.metric}>
                    <Ionicons name="flash-outline" size={14} color={colors.text.secondary} />
                    <Text style={styles.metricValue}>
                      {workout.splits.length} exercise{workout.splits.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
              </View>

              {/* Show sprint splits if present */}
              {workout.type === 'sprint_log' && workout.splits && workout.splits.length > 0 && (
                <View style={styles.splitsContainer}>
                  {workout.splits.map((split, i) => (
                    <View key={i} style={styles.splitRow}>
                      <Text style={styles.splitName}>{split.exerciseName || `Set ${i + 1}`}</Text>
                      {split.repTimes && (
                        <Text style={styles.splitTimes}>
                          {split.repTimes.map(t => `${t}s`).join(', ')}
                        </Text>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {workout.notes && (
                <Text style={styles.workoutNotes} numberOfLines={2}>{workout.notes}</Text>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  sessionCard: {
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sessionIcon: {
    marginRight: spacing.sm,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    ...typography.bodyBold,
    color: colors.text.primary,
  },
  sessionDate: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metricValue: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  splitsContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.background.secondary,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  splitName: {
    ...typography.caption,
    color: colors.text.primary,
    fontWeight: '600',
  },
  splitTimes: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  workoutNotes: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
});
