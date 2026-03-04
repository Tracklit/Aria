import React, { useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, typography, spacing, borderRadius } from '../../src/theme';

interface Lap {
  number: number;
  time: number;
  split: number;
}

export default function StopwatchScreen() {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [laps, setLaps] = useState<Lap[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef(0);
  const elapsedRef = useRef(0);

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  };

  const start = useCallback(() => {
    startTimeRef.current = Date.now() - elapsedRef.current;
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTimeRef.current;
      elapsedRef.current = elapsed;
      setTime(elapsed);
    }, 10);
    setIsRunning(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const reset = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTime(0);
    setIsRunning(false);
    setLaps([]);
    elapsedRef.current = 0;
  }, []);

  const lap = useCallback(() => {
    const lastLapTime = laps.length > 0 ? laps[0].time : 0;
    const split = time - lastLapTime;
    setLaps(prev => [{ number: prev.length + 1, time, split }, ...prev]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, [time, laps]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { reset(); router.back(); }}>
          <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Stopwatch</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.timerSection}>
        <Text style={styles.timerText}>{formatTime(time)}</Text>
      </View>

      <View style={styles.buttonRow}>
        {isRunning ? (
          <>
            <TouchableOpacity style={[styles.button, styles.lapButton]} onPress={lap}>
              <Text style={styles.buttonText}>Lap</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.stopButton]} onPress={stop}>
              <Text style={styles.buttonText}>Stop</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity style={[styles.button, styles.resetBtn]} onPress={reset}>
              <Text style={styles.buttonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.startBtn]} onPress={start}>
              <Text style={styles.buttonText}>{time > 0 ? 'Resume' : 'Start'}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <FlatList
        data={laps}
        keyExtractor={(item) => item.number.toString()}
        renderItem={({ item }) => (
          <View style={styles.lapRow}>
            <Text style={styles.lapNumber}>Lap {item.number}</Text>
            <Text style={styles.lapSplit}>{formatTime(item.split)}</Text>
            <Text style={styles.lapTime}>{formatTime(item.time)}</Text>
          </View>
        )}
        contentContainerStyle={styles.lapList}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerTitle: { ...typography.h2, color: colors.text.primary },
  timerSection: { alignItems: 'center', paddingVertical: spacing.xl * 2 },
  timerText: { fontSize: 64, fontWeight: '200', color: colors.text.primary, fontVariant: ['tabular-nums'] },
  buttonRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg, paddingHorizontal: spacing.xl },
  button: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  lapButton: { backgroundColor: colors.background.cardSolid },
  stopButton: { backgroundColor: colors.red },
  resetBtn: { backgroundColor: colors.background.cardSolid },
  startBtn: { backgroundColor: colors.green },
  buttonText: { ...typography.body, color: colors.text.primary, fontWeight: '600' },
  lapList: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  lapRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.background.secondary },
  lapNumber: { ...typography.body, color: colors.text.secondary, width: 70 },
  lapSplit: { ...typography.body, color: colors.text.primary, fontVariant: ['tabular-nums'] },
  lapTime: { ...typography.caption, color: colors.text.tertiary, fontVariant: ['tabular-nums'] },
});
