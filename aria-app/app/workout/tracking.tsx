import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CircularProgress } from '../../src/components/ui';
import { WorkoutMetric } from '../../src/components/features';
import { useWorkout } from '../../src/context';
import { colors, typography, spacing, borderRadius } from '../../src/theme';
import { WorkoutMetrics } from '../../src/types';
import { ToastManager } from '../../src/components/Toast';

export default function WorkoutTrackingScreen() {
  const router = useRouter();
  const { activeSession, todaysWorkout, finishWorkoutSession, updateWorkoutSession } = useWorkout();

  // Derive current workout metrics from active session or use defaults for demo
  const currentWorkout: WorkoutMetrics | null = activeSession?.liveMetrics
    ? {
        type: todaysWorkout?.title || todaysWorkout?.type || 'Workout',
        duration: activeSession.liveMetrics.duration,
        distance: activeSession.liveMetrics.distance / 1609.34, // Convert meters to miles
        pace: activeSession.liveMetrics.avgPace,
        heartRate: activeSession.liveMetrics.avgHr,
        spm: activeSession.liveMetrics.currentCadence,
        status: activeSession.status === 'paused' ? 'paused' : activeSession.status === 'active' ? 'active' : 'recovery',
      }
    : null;

  if (!currentWorkout && !activeSession) {
    return null;
  }

  // Use defaults if no live metrics yet
  const workoutData: WorkoutMetrics = currentWorkout || {
    type: todaysWorkout?.title || 'Workout',
    duration: 0,
    distance: 0,
    pace: '0:00',
    heartRate: 0,
    status: 'active',
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEnd = () => {
    Alert.alert('End Workout', 'Are you sure you want to end this workout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End',
        style: 'destructive',
        onPress: async () => {
          try {
            await finishWorkoutSession();
            ToastManager.success('Workout completed! Great job!');
            router.back();
          } catch (error) {
            ToastManager.error('Failed to save workout. Please try again.');
          }
        },
      },
    ]);
  };

  const handleResume = async () => {
    await updateWorkoutSession({ status: 'active' });
  };

  const handlePause = async () => {
    await updateWorkoutSession({ status: 'paused' });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Track</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <Text style={styles.workoutTitle}>{workoutData.type}</Text>

        {/* Circular Progress */}
        <View style={styles.progressContainer}>
          <CircularProgress size={260} strokeWidth={10} progress={0.65}>
            <View style={styles.progressContent}>
              <Text style={styles.timeText}>{formatTime(workoutData.duration)}</Text>
              <Text style={styles.statusText}>{workoutData.status}</Text>
            </View>
          </CircularProgress>
        </View>

        {/* Metrics Row */}
        <View style={styles.metricsRow}>
          <WorkoutMetric
            icon="location"
            value={workoutData.distance.toFixed(2)}
            unit="mi"
          />
          <WorkoutMetric icon="speedometer" value={workoutData.pace} unit="/mi" />
          <WorkoutMetric icon="heart" value={workoutData.heartRate.toString()} unit="bpm" />
        </View>

        {/* Control Buttons */}
        <View style={styles.controlsRow}>
          <TouchableOpacity style={styles.endButton} onPress={handleEnd}>
            <Text style={styles.endButtonText}>End</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resumeButton} onPress={handleResume}>
            <Text style={styles.resumeButtonText}>Resume</Text>
            <Ionicons name="play-forward" size={20} color={colors.teal} />
          </TouchableOpacity>
        </View>

        {/* Bottom Stats */}
        <View style={styles.bottomStats}>
          <View style={styles.statRow}>
            <Ionicons name="location" size={18} color={colors.primary} />
            <Text style={styles.statText}>
              {workoutData.distance.toFixed(2)} <Text style={styles.statUnit}>mi</Text>
            </Text>
          </View>
          <View style={styles.statRow}>
            <Ionicons name="speedometer" size={18} color={colors.primary} />
            <Text style={styles.statText}>
              {workoutData.pace} <Text style={styles.statUnit}>/mi</Text>
            </Text>
          </View>
          <View style={styles.statRow}>
            <Ionicons name="heart" size={18} color={colors.red} />
            <Text style={styles.statText}>
              {workoutData.heartRate} <Text style={styles.statUnit}>bpm</Text>
            </Text>
          </View>
          {workoutData.spm && (
            <View style={styles.statRow}>
              <Ionicons name="pulse" size={18} color={colors.teal} />
              <Text style={styles.statText}>
                {workoutData.spm} <Text style={styles.statUnit}>spr</Text>
              </Text>
            </View>
          )}
        </View>

        {/* Watch Preview */}
        <View style={styles.watchPreview}>
          <View style={styles.watchScreen}>
            <Text style={styles.watchTitle}>{workoutData.type}</Text>
            <Text style={styles.watchTime}>{formatTime(workoutData.duration)}</Text>
            <Text style={styles.watchStatus}>{workoutData.status}</Text>
            <View style={styles.watchStats}>
              <Text style={styles.watchStat}>
                {workoutData.heartRate} <Text style={styles.watchUnit}>bpm</Text>
              </Text>
              <Text style={styles.watchStat}>
                {workoutData.pace} <Text style={styles.watchUnit}>/mi</Text>
              </Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
  },
  placeholder: {
    width: 44,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  workoutTitle: {
    ...typography.h2,
    color: colors.primary,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  progressContent: {
    alignItems: 'center',
  },
  timeText: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  statusText: {
    ...typography.h3,
    color: colors.green,
    textTransform: 'capitalize',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.xl,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  endButton: {
    flex: 1,
    height: 56,
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  endButtonText: {
    ...typography.bodyBold,
    color: colors.red,
  },
  resumeButton: {
    flex: 1,
    height: 56,
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resumeButtonText: {
    ...typography.bodyBold,
    color: colors.teal,
    marginRight: spacing.xs,
  },
  bottomStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.lg,
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    ...typography.bodyBold,
    color: colors.text.primary,
    marginLeft: spacing.xs,
  },
  statUnit: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '400',
  },
  watchPreview: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    width: 120,
    height: 120,
    backgroundColor: colors.background.primary,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: colors.background.cardSolid,
    overflow: 'hidden',
  },
  watchScreen: {
    flex: 1,
    padding: spacing.xs,
    justifyContent: 'center',
    alignItems: 'center',
  },
  watchTitle: {
    ...typography.caption,
    color: colors.primary,
    fontSize: 10,
    marginBottom: 2,
  },
  watchTime: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 2,
  },
  watchStatus: {
    fontSize: 10,
    color: colors.green,
    textTransform: 'capitalize',
    marginBottom: spacing.xs,
  },
  watchStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  watchStat: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.primary,
  },
  watchUnit: {
    fontSize: 8,
    color: colors.text.secondary,
  },
});
