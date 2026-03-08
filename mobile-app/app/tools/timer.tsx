import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, ScrollView, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withTiming, Easing, runOnJS } from 'react-native-reanimated';
import { impactLight, impactMedium, impactHeavy, notificationSuccess, selectionChanged } from '../../src/utils/haptics';
import { useThemedStyles, useColors, typography, spacing, borderRadius } from '../../src/theme';
import { ThemeColors } from '../../src/theme/colors';
import { useRecentTimers } from '../../src/hooks/useRecentTimers';

const screenWidth = Dimensions.get('window').width;
const ringSize = Math.min(screenWidth * 0.7, 300);
const ringStrokeWidth = 6;
const ringRadius = (ringSize - ringStrokeWidth) / 2;
const ringCircumference = 2 * Math.PI * ringRadius;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const PRESETS = [
  { label: '1 min', seconds: 60 },
  { label: '3 min', seconds: 180 },
  { label: '5 min', seconds: 300 },
  { label: '10 min', seconds: 600 },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const SECONDS = Array.from({ length: 60 }, (_, i) => i);

const PICKER_ITEM_HEIGHT = 44;
const PICKER_VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = PICKER_ITEM_HEIGHT * PICKER_VISIBLE_ITEMS;

type TimerState = 'idle' | 'running' | 'paused' | 'finished';

function PickerColumn({
  data,
  value,
  onValueChange,
  label,
  colors,
}: {
  data: number[];
  value: number;
  onValueChange: (v: number) => void;
  label: string;
  colors: ThemeColors;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const isUserScroll = useRef(true);

  useEffect(() => {
    isUserScroll.current = false;
    scrollRef.current?.scrollTo({ y: value * PICKER_ITEM_HEIGHT, animated: false });
    setTimeout(() => { isUserScroll.current = true; }, 100);
  }, [value]);

  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ ...typography.caption, color: colors.text.tertiary, marginBottom: 4, fontSize: 11 }}>{label}</Text>
      <View style={{ height: PICKER_HEIGHT, width: 60, overflow: 'hidden' }}>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: PICKER_ITEM_HEIGHT * 2,
            left: 0,
            right: 0,
            height: PICKER_ITEM_HEIGHT,
            borderTopWidth: 1,
            borderBottomWidth: 1,
            borderColor: colors.primary,
            zIndex: 1,
          }}
        />
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={PICKER_ITEM_HEIGHT}
          decelerationRate="fast"
          contentContainerStyle={{ paddingVertical: PICKER_ITEM_HEIGHT * 2 }}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.y / PICKER_ITEM_HEIGHT);
            const clamped = Math.max(0, Math.min(idx, data.length - 1));
            if (isUserScroll.current && clamped !== value) {
              selectionChanged();
              onValueChange(clamped);
            }
          }}
        >
          {data.map((item) => {
            const isSelected = item === value;
            return (
              <View key={item} style={{ height: PICKER_ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' }}>
                <Text
                  style={{
                    fontFamily: 'SpaceMono_400Regular',
                    fontSize: isSelected ? 22 : 16,
                    fontWeight: isSelected ? '600' : '300',
                    color: isSelected ? colors.text.primary : colors.text.tertiary,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {item.toString().padStart(2, '0')}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

export default function TimerScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const { addRecent } = useRecentTimers();
  const params = useLocalSearchParams<{ h?: string; m?: string; s?: string }>();

  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);

  // Apply route params from recent timer tap
  useEffect(() => {
    if (params.h || params.m || params.s) {
      setHours(params.h ? parseInt(params.h, 10) || 0 : 0);
      setMinutes(params.m ? parseInt(params.m, 10) || 0 : 0);
      setSeconds(params.s ? parseInt(params.s, 10) || 0 : 0);
    }
  }, [params.h, params.m, params.s]);
  const [remainingMs, setRemainingMs] = useState(0);
  const [totalMs, setTotalMs] = useState(0);
  const [keepAwake, setKeepAwake] = useState(true);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const endTimeRef = useRef(0);
  const remainingAtPauseRef = useRef(0);
  const completionSoundRef = useRef<Audio.Sound | null>(null);

  const progress = useSharedValue(1);

  useEffect(() => {
    if (keepAwake) {
      void activateKeepAwakeAsync('timer');
    } else {
      void deactivateKeepAwake('timer');
    }
    return () => { void deactivateKeepAwake('timer'); };
  }, [keepAwake]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      void completionSoundRef.current?.unloadAsync();
    };
  }, []);

  const playCompletionSound = useCallback(async () => {
    try {
      if (completionSoundRef.current) {
        await completionSoundRef.current.replayAsync();
      } else {
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/audio/bang.mp3'),
          { volume: 0.5 },
        );
        completionSoundRef.current = sound;
        await sound.playAsync();
      }
    } catch {}
  }, []);

  const onTimerComplete = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimerState('finished');
    setRemainingMs(0);
    progress.value = 0;
    notificationSuccess();
    playCompletionSound();
  }, [playCompletionSound, progress]);

  const totalFromPicker = useMemo(() => {
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
  }, [hours, minutes, seconds]);

  const startTimer = useCallback(() => {
    const total = totalFromPicker;
    if (total <= 0) return;
    addRecent(total / 1000);
    setTotalMs(total);
    setRemainingMs(total);
    endTimeRef.current = Date.now() + total;
    progress.value = 1;
    progress.value = withTiming(0, { duration: total, easing: Easing.linear });

    intervalRef.current = setInterval(() => {
      const remaining = endTimeRef.current - Date.now();
      if (remaining <= 0) {
        runOnJS(onTimerComplete)();
      } else {
        setRemainingMs(remaining);
      }
    }, 50);
    setTimerState('running');
    impactLight();
  }, [totalFromPicker, progress, onTimerComplete, addRecent]);

  const pauseTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    remainingAtPauseRef.current = remainingMs;
    progress.value = totalMs > 0 ? remainingMs / totalMs : 0;
    setTimerState('paused');
    impactMedium();
  }, [remainingMs, totalMs, progress]);

  const resumeTimer = useCallback(() => {
    const remaining = remainingAtPauseRef.current;
    if (remaining <= 0) return;
    endTimeRef.current = Date.now() + remaining;
    progress.value = withTiming(0, { duration: remaining, easing: Easing.linear });

    intervalRef.current = setInterval(() => {
      const rem = endTimeRef.current - Date.now();
      if (rem <= 0) {
        runOnJS(onTimerComplete)();
      } else {
        setRemainingMs(rem);
      }
    }, 50);
    setTimerState('running');
    impactLight();
  }, [progress, onTimerComplete]);

  const cancelTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimerState('idle');
    setRemainingMs(0);
    setTotalMs(0);
    progress.value = 1;
    impactMedium();
  }, [progress]);

  const selectPreset = useCallback((secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    setHours(h);
    setMinutes(m);
    setSeconds(s);
    selectionChanged();
  }, []);

  const formatRemaining = useCallback((ms: number) => {
    if (ms <= 0) return '00:00.00';
    const totalSecs = Math.ceil(ms / 1000);
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    // Show centiseconds in last 10 seconds
    if (ms < 10000) {
      const sec = Math.floor(ms / 1000);
      const cs = Math.floor((ms % 1000) / 10);
      return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, []);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: ringCircumference * (1 - progress.value),
  }));

  const canStart = totalFromPicker > 0;
  const isActive = timerState === 'running' || timerState === 'paused' || timerState === 'finished';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { cancelTimer(); router.back(); }}>
          <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Timer</Text>
        <TouchableOpacity onPress={() => setKeepAwake(!keepAwake)}>
          <Ionicons
            name={keepAwake ? 'eye-outline' : 'eye-off-outline'}
            size={24}
            color={keepAwake ? colors.primary : colors.text.tertiary}
          />
        </TouchableOpacity>
      </View>

      {!isActive ? (
        /* IDLE: Show picker and presets */
        <View style={styles.idleContainer}>
          <View style={styles.pickerRow}>
            <PickerColumn data={HOURS} value={hours} onValueChange={setHours} label="HR" colors={colors} />
            <Text style={styles.pickerSeparator}>:</Text>
            <PickerColumn data={MINUTES} value={minutes} onValueChange={setMinutes} label="MIN" colors={colors} />
            <Text style={styles.pickerSeparator}>:</Text>
            <PickerColumn data={SECONDS} value={seconds} onValueChange={setSeconds} label="SEC" colors={colors} />
          </View>

          <View style={styles.presetsRow}>
            {PRESETS.map((p) => (
              <TouchableOpacity
                key={p.label}
                style={[
                  styles.presetChip,
                  totalFromPicker === p.seconds * 1000 && styles.presetChipActive,
                ]}
                onPress={() => selectPreset(p.seconds)}
              >
                <Text
                  style={[
                    styles.presetChipText,
                    totalFromPicker === p.seconds * 1000 && styles.presetChipTextActive,
                  ]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, canStart ? styles.startBtn : styles.disabledBtn]}
              onPress={startTimer}
              disabled={!canStart}
            >
              <Text style={[styles.buttonText, !canStart && styles.disabledText]}>Start</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* ACTIVE: Show countdown ring */
        <View style={styles.activeContainer}>
          <View style={styles.ringWrapper}>
            <Svg width={ringSize} height={ringSize} style={{ transform: [{ rotate: '-90deg' }] }}>
              <Circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={ringRadius}
                stroke={colors.background.secondary}
                strokeWidth={ringStrokeWidth}
                fill="none"
              />
              <AnimatedCircle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={ringRadius}
                stroke={timerState === 'finished' ? colors.green : colors.primary}
                strokeWidth={ringStrokeWidth}
                fill="none"
                strokeDasharray={ringCircumference}
                animatedProps={animatedProps}
                strokeLinecap="round"
              />
            </Svg>
            <View style={styles.ringCenter}>
              <Text style={styles.countdownText} adjustsFontSizeToFit numberOfLines={1}>
                {timerState === 'finished' ? 'Done' : formatRemaining(remainingMs)}
              </Text>
              {timerState !== 'finished' && totalMs > 0 && (
                <Text style={styles.totalLabel}>
                  of {formatRemaining(totalMs)}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.buttonRow}>
            {timerState === 'running' && (
              <>
                <TouchableOpacity style={[styles.button, styles.cancelBtn]} onPress={cancelTimer}>
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.pauseBtn]} onPress={pauseTimer}>
                  <Text style={styles.buttonText}>Pause</Text>
                </TouchableOpacity>
              </>
            )}
            {timerState === 'paused' && (
              <>
                <TouchableOpacity style={[styles.button, styles.cancelBtn]} onPress={cancelTimer}>
                  <Text style={styles.buttonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.startBtn]} onPress={resumeTimer}>
                  <Text style={styles.buttonText}>Resume</Text>
                </TouchableOpacity>
              </>
            )}
            {timerState === 'finished' && (
              <TouchableOpacity style={[styles.button, styles.resetBtn]} onPress={cancelTimer}>
                <Text style={styles.buttonText}>Done</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: { ...typography.h2, color: colors.text.primary },

  /* Idle state */
  idleContainer: { flex: 1, alignItems: 'center', paddingTop: spacing.xl * 2 },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  pickerSeparator: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: 28,
    color: colors.text.tertiary,
    marginHorizontal: spacing.xs,
    marginTop: 16,
  },
  presetsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl * 2,
  },
  presetChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.cardSolid,
  },
  presetChipActive: {
    backgroundColor: colors.primary,
  },
  presetChipText: {
    ...typography.captionBold,
    color: colors.text.secondary,
  },
  presetChipTextActive: {
    color: '#000000',
  },

  /* Active state */
  activeContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ringWrapper: {
    width: ringSize,
    height: ringSize,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl * 2,
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  countdownText: {
    fontFamily: 'SpaceMono_400Regular',
    fontSize: Math.min(screenWidth * 0.12, 52),
    fontWeight: '200',
    color: colors.text.primary,
    fontVariant: ['tabular-nums'],
  },
  totalLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginTop: 4,
  },

  /* Buttons */
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  button: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtn: { backgroundColor: colors.green },
  pauseBtn: { backgroundColor: colors.orange },
  cancelBtn: { backgroundColor: colors.background.cardSolid },
  resetBtn: { backgroundColor: colors.primary },
  disabledBtn: { backgroundColor: colors.background.secondary },
  buttonText: { ...typography.body, color: colors.text.primary, fontWeight: '600' },
  disabledText: { color: colors.text.tertiary },
});
