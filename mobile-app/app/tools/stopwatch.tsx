import React, { useState, useRef, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { impactLight, impactMedium, impactHeavy } from '../../src/utils/haptics';
import { colors, typography, spacing, borderRadius } from '../../src/theme';

interface Lap {
  number: number;
  time: number;
  split: number;
}

const screenWidth = Dimensions.get('window').width;
const timerSize = Math.min(screenWidth * 0.55, 240);
const timerFontSize = Math.min(screenWidth * 0.12, 60);

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
    impactLight();
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    impactMedium();
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
    impactHeavy();
  }, [time, laps]);

  // Find best and worst split indices (only when 2+ laps)
  const { bestSplit, worstSplit } = useMemo(() => {
    if (laps.length < 2) return { bestSplit: -1, worstSplit: -1 };
    let best = Infinity;
    let worst = -Infinity;
    let bestIdx = -1;
    let worstIdx = -1;
    laps.forEach((l, i) => {
      if (l.split < best) { best = l.split; bestIdx = i; }
      if (l.split > worst) { worst = l.split; worstIdx = i; }
    });
    return { bestSplit: bestIdx, worstSplit: worstIdx };
  }, [laps]);

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
        <View style={styles.timerCircle}>
          <Text style={styles.timerText} adjustsFontSizeToFit numberOfLines={1}>{formatTime(time)}</Text>
        </View>
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

      {laps.length > 0 && (
        <View style={styles.lapHeader}>
          <Text style={styles.lapCount}>Laps: {laps.length}</Text>
        </View>
      )}

      <FlatList
        data={laps}
        keyExtractor={(item) => item.number.toString()}
        renderItem={({ item, index }) => {
          const isBest = index === bestSplit;
          const isWorst = index === worstSplit;
          const rowBg = index % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent';
          return (
            <View style={[styles.lapRow, { backgroundColor: rowBg }]}>
              <Text style={styles.lapNumber}>Lap {item.number}</Text>
              <Text style={[styles.lapSplit, isBest && styles.bestSplit, isWorst && styles.worstSplit]}>
                {formatTime(item.split)}
              </Text>
              <Text style={styles.lapTime}>{formatTime(item.time)}</Text>
            </View>
          );
        }}
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
  timerCircle: { width: timerSize, height: timerSize, borderRadius: timerSize / 2, borderWidth: 1, borderColor: colors.background.secondary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  timerText: { fontFamily: 'SpaceMono_400Regular', fontSize: timerFontSize, fontWeight: '100', color: colors.text.primary, fontVariant: ['tabular-nums'] },
  buttonRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg, paddingHorizontal: spacing.xl },
  button: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center' },
  lapButton: { backgroundColor: colors.background.cardSolid },
  stopButton: { backgroundColor: colors.red },
  resetBtn: { backgroundColor: colors.background.cardSolid },
  startBtn: { backgroundColor: colors.green },
  buttonText: { ...typography.body, color: colors.text.primary, fontWeight: '600' },
  lapHeader: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  lapCount: { ...typography.captionBold, color: colors.text.secondary, textTransform: 'uppercase', letterSpacing: 1 },
  lapList: { paddingHorizontal: spacing.lg },
  lapRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.background.secondary, borderRadius: borderRadius.sm },
  lapNumber: { ...typography.body, color: colors.text.secondary, width: 70 },
  lapSplit: { ...typography.body, color: colors.text.primary, fontVariant: ['tabular-nums'] },
  bestSplit: { color: colors.green },
  worstSplit: { color: colors.red },
  lapTime: { ...typography.caption, color: colors.text.tertiary, fontVariant: ['tabular-nums'] },
});
