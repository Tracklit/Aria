import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useWorkout } from '../../src/context';
import { ToastManager } from '../../src/components/Toast';

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

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
  const pace = live.avgPace || '4:24';
  const heartRate = live.avgHr || 158;
  const spm = live.currentCadence || 180;
  const status = activeSession.status || 'active';
  const progress = 0.75;

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
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text testID="track.title" style={styles.headerTitle}>Track</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.workoutTitle}>{todaysWorkout?.title || 'Sprint Intervals'}</Text>

      <View style={styles.timerContainer}>
        <Svg width={250} height={250} viewBox="0 0 250 250">
          <Defs>
            <LinearGradient id="ring" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#007AFF" />
              <Stop offset="50%" stopColor="#00E5FF" />
              <Stop offset="100%" stopColor="#00E676" />
            </LinearGradient>
          </Defs>
          <Circle cx={125} cy={125} r={110} stroke="#333" strokeWidth={12} fill="none" />
          <Circle
            cx={125}
            cy={125}
            r={110}
            stroke="url(#ring)"
            strokeWidth={12}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={700}
            strokeDashoffset={700 * (1 - progress)}
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
          <Text style={styles.metricValue}>{pace}</Text>
          <Text style={styles.metricUnit}>/mi</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricValue}>{heartRate}</Text>
          <Text style={styles.metricUnit}>bpm</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity testID="track.end" style={styles.endBtn} onPress={handleEnd}>
          <Text style={styles.endBtnText}>End</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="track.resume" style={styles.resumeBtn} onPress={handleResume}>
          <Text style={styles.resumeBtnText}>Resume &gt;&gt;</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomStats}>
        <View style={styles.row}>
          <Text style={styles.bigText}>{distanceMiles.toFixed(2)} mi</Text>
          <Text style={styles.bigText}>{pace}/mi</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.bigText}>{heartRate} bpm</Text>
          <Text style={styles.bigText}>{spm} spm</Text>
        </View>
      </View>

      <View style={styles.watchPreview}>
        <Text style={styles.watchTitle}>{todaysWorkout?.title || 'Sprint Intervals'}</Text>
        <Text style={styles.watchTime}>{formatTime(duration)}</Text>
        <Text style={styles.watchStatus}>{status}</Text>
        <View style={styles.watchStats}>
          <Text style={styles.watchStat}>{heartRate} BPM</Text>
          <Text style={styles.watchStat}>{pace}/MI</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#FFF',
    marginBottom: 12,
  },
  emptyButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#111',
  },
  emptyButtonText: {
    color: '#FFF',
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  workoutTitle: {
    textAlign: 'center',
    color: '#00E5FF',
    fontSize: 28,
    marginTop: 20,
  },
  timerContainer: {
    marginTop: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    position: 'absolute',
    alignItems: 'center',
  },
  timerTime: {
    color: '#FFF',
    fontSize: 48,
    fontWeight: '700',
  },
  timerLabel: {
    color: '#00E676',
    fontSize: 20,
    marginTop: 5,
    textTransform: 'capitalize',
  },
  metricsTop: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingHorizontal: 24,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '700',
  },
  metricUnit: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  controls: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 24,
    marginTop: 20,
  },
  endBtn: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#221a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  endBtnText: {
    color: '#FF3B30',
    fontWeight: '600',
    fontSize: 16,
  },
  resumeBtn: {
    flex: 2,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#00574b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resumeBtnText: {
    color: '#00E5FF',
    fontWeight: '600',
    fontSize: 16,
  },
  bottomStats: {
    marginTop: 18,
    paddingHorizontal: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  bigText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '600',
  },
  watchPreview: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 120,
    height: 120,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: '#222',
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  watchTitle: {
    color: '#00E5FF',
    fontSize: 10,
    textAlign: 'center',
  },
  watchTime: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  watchStatus: {
    color: '#00E676',
    textTransform: 'capitalize',
    fontSize: 10,
    marginBottom: 4,
  },
  watchStats: {
    width: '100%',
    alignItems: 'center',
  },
  watchStat: {
    color: '#FFF',
    fontSize: 10,
  },
});
