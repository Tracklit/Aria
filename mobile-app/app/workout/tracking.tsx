import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useWorkout } from '../../src/context';
import { ToastManager } from '../../src/components/Toast';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing, borderRadius } from '../../src/theme/spacing';

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

const RING_CIRCUMFERENCE = 2 * Math.PI * 110;

export default function WorkoutTrackingScreen() {
  const router = useRouter();
  const { activeSession, todaysWorkout, finishWorkoutSession, updateWorkoutSession } = useWorkout();

  if (!activeSession) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.empty}>
          <Text testID="track.no_session" style={styles.emptyText}>No active workout session.</Text>
          <TouchableOpacity testID="track.no_session_back" style={styles.emptyButton} onPress={() => router.back()}>
            <Text style={styles.emptyButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const live = activeSession.liveMetrics || {};
  const duration = live.duration || 0;
  const distanceMiles = (live.distance || 0) / 1609.34;
  const pace = live.avgPace || null;
  const heartRate = live.avgHr || null;
  const status = activeSession.status || 'active';

  const progress = duration > 0 && live.distance ? Math.min(distanceMiles / 1, 1) : 0;

  const handleEnd = () => {
    Alert.alert('End Workout', 'Are you sure you want to end this workout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End',
        style: 'destructive',
        onPress: async () => {
          await finishWorkoutSession();
          ToastManager.success('Workout completed');
          router.back();
        },
      },
    ]);
  };

  const handleResume = async () => {
    await updateWorkoutSession({ status: 'active' });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity testID="track.back" onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text testID="track.title" style={styles.headerTitle}>Track</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.workoutTitle}>{todaysWorkout?.title || 'Sprint Intervals'}</Text>

      <View style={styles.timerContainer}>
        <Svg width={250} height={250} viewBox="0 0 250 250">
          <Defs>
            <LinearGradient id="ring" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor={colors.primary} />
              <Stop offset="50%" stopColor={colors.teal} />
              <Stop offset="100%" stopColor={colors.green} />
            </LinearGradient>
          </Defs>
          <Circle cx={125} cy={125} r={110} stroke={colors.text.tertiary} strokeWidth={12} fill="none" />
          <Circle
            cx={125}
            cy={125}
            r={110}
            stroke="url(#ring)"
            strokeWidth={12}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
            rotation={-90}
            origin="125,125"
          />
        </Svg>
        <View style={styles.timerText}>
          <Text style={styles.timerTime}>{formatTime(duration)}</Text>
          <Text style={styles.timerLabel}>{status}</Text>
        </View>
      </View>

      <View style={styles.metricsTop}>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{distanceMiles.toFixed(2)}</Text>
          <Text style={styles.metricUnit}>mi</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, !pace && styles.noData]}>{pace || '--'}</Text>
          <Text style={styles.metricUnit}>/mi</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, !heartRate && styles.noData]}>{heartRate || '--'}</Text>
          <Text style={styles.metricUnit}>bpm</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity testID="track.end" style={styles.endBtn} onPress={handleEnd}>
          <Text style={styles.endBtnText}>End</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="track.resume" style={styles.resumeBtn} onPress={handleResume}>
          <Text style={styles.resumeBtnText}>Resume</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.teal} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  emptyButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.background.secondary,
  },
  emptyButtonText: {
    color: colors.text.primary,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: colors.text.primary,
    ...typography.bodyBold,
    fontSize: 18,
  },
  workoutTitle: {
    textAlign: 'center',
    color: colors.teal,
    ...typography.h2,
    marginTop: spacing.lg - 4,
  },
  timerContainer: {
    marginTop: spacing.lg + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    position: 'absolute',
    alignItems: 'center',
  },
  timerTime: {
    color: colors.text.primary,
    fontSize: 48,
    fontWeight: '700',
  },
  timerLabel: {
    color: colors.green,
    fontSize: 20,
    marginTop: spacing.xs + 1,
    textTransform: 'capitalize',
  },
  metricsTop: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: spacing.md - 4,
    paddingHorizontal: spacing.lg,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    color: colors.text.primary,
    ...typography.h2,
  },
  metricUnit: {
    color: colors.text.secondary,
    ...typography.caption,
  },
  noData: {
    color: colors.text.tertiary,
  },
  controls: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg - 4,
  },
  endBtn: {
    flex: 1,
    height: 52,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endBtnText: {
    color: colors.red,
    ...typography.bodyBold,
  },
  resumeBtn: {
    flex: 2,
    height: 52,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  resumeBtnText: {
    color: colors.teal,
    ...typography.bodyBold,
  },
});
