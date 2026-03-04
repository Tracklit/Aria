import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { colors, typography, spacing, borderRadius } from '../../src/theme';

type Phase = 'idle' | 'marks' | 'set' | 'bang' | 'done';

const PHASE_COLORS: Record<Phase, string> = {
  idle: colors.text.primary,
  marks: colors.yellow,
  set: colors.orange,
  bang: colors.green,
  done: colors.text.primary,
};

const PHASE_STEPS: { key: Phase; label: string }[] = [
  { key: 'marks', label: 'Marks' },
  { key: 'set', label: 'Set' },
  { key: 'bang', label: 'GO' },
];

function StepIndicator({ phase }: { phase: Phase }) {
  const phaseIndex = PHASE_STEPS.findIndex(s => s.key === phase);

  return (
    <View style={stepStyles.container}>
      {PHASE_STEPS.map((step, i) => {
        const isActive = phaseIndex >= i;
        const dotColor = isActive ? PHASE_COLORS[step.key] : colors.background.cardSolid;
        return (
          <View key={step.key} style={stepStyles.step}>
            <View style={[stepStyles.dot, { backgroundColor: dotColor, borderColor: isActive ? dotColor : colors.text.tertiary }]} />
            <Text style={[stepStyles.label, isActive && { color: PHASE_COLORS[step.key] }]}>{step.label}</Text>
            {i < PHASE_STEPS.length - 1 && (
              <View style={[stepStyles.line, isActive && phaseIndex > i && { backgroundColor: PHASE_COLORS[PHASE_STEPS[i + 1].key] }]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

export default function StartGunScreen() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [randomize, setRandomize] = useState(true);
  const [flash, setFlash] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    return () => {
      if (soundRef.current) soundRef.current.unloadAsync();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Pulsing ring animation for idle/done states
  useEffect(() => {
    if (phase === 'idle' || phase === 'done') {
      const loop = Animated.loop(
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
      pulseOpacity.setValue(1);
    }
  }, [phase, pulseAnim, pulseOpacity]);

  const playSound = async (file: any): Promise<void> => {
    if (soundRef.current) await soundRef.current.unloadAsync();
    const { sound } = await Audio.Sound.createAsync(file);
    soundRef.current = sound;
    await sound.playAsync();
  };

  const startSequence = async () => {
    setPhase('marks');
    await playSound(require('../../assets/audio/on-your-marks.mp3'));

    timeoutRef.current = setTimeout(async () => {
      setPhase('set');
      await playSound(require('../../assets/audio/set.mp3'));

      const delay = randomize ? 1000 + Math.random() * 2000 : 2000;
      timeoutRef.current = setTimeout(async () => {
        setPhase('bang');
        setFlash(true);
        await playSound(require('../../assets/audio/bang.mp3'));
        setTimeout(() => setFlash(false), 150);
        setTimeout(() => setPhase('done'), 1000);
      }, delay);
    }, 3000);
  };

  const reset = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (soundRef.current) soundRef.current.unloadAsync();
    setPhase('idle');
    setFlash(false);
  };

  const getPhaseText = () => {
    switch (phase) {
      case 'idle': return 'Ready';
      case 'marks': return 'On Your Marks...';
      case 'set': return 'Set...';
      case 'bang': return 'GO!';
      case 'done': return 'Complete';
    }
  };

  const showStartButton = phase === 'idle' || phase === 'done';

  return (
    <SafeAreaView style={[styles.container, flash && styles.flashBg]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { reset(); router.back(); }}>
          <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Start Gun</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.content}>
        <StepIndicator phase={phase} />

        <Text style={[styles.phaseText, { color: PHASE_COLORS[phase] }]}>{getPhaseText()}</Text>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Randomize set-to-gun delay</Text>
          <Switch value={randomize} onValueChange={setRandomize} trackColor={{ true: colors.primary }} disabled={phase !== 'idle'} />
        </View>

        {showStartButton ? (
          <View style={styles.buttonWrapper}>
            <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }], opacity: pulseOpacity }]} />
            <TouchableOpacity style={styles.startButton} onPress={startSequence}>
              <Ionicons name="play" size={40} color={colors.text.primary} />
              <Text style={styles.startText}>START</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.resetButton} onPress={reset}>
            <Ionicons name="stop" size={32} color={colors.text.primary} />
            <Text style={styles.resetText}>RESET</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const stepStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl * 2, gap: 0 },
  step: { alignItems: 'center', flexDirection: 'row' },
  dot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  label: { ...typography.caption, color: colors.text.tertiary, position: 'absolute', top: 34, width: 50, textAlign: 'center' },
  line: { width: 40, height: 2, backgroundColor: colors.background.cardSolid, marginHorizontal: spacing.sm },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  flashBg: { backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerTitle: { ...typography.h2, color: colors.text.primary },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  phaseText: { fontSize: 42, fontWeight: '700', marginBottom: spacing.xl * 2, textAlign: 'center' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', backgroundColor: colors.background.cardSolid, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.xl },
  settingLabel: { ...typography.body, color: colors.text.primary },
  buttonWrapper: { alignItems: 'center', justifyContent: 'center' },
  pulseRing: { position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 2, borderColor: colors.green },
  startButton: { backgroundColor: colors.green, width: 140, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center' },
  startText: { ...typography.body, color: colors.text.primary, fontWeight: '700', marginTop: spacing.xs },
  resetButton: { backgroundColor: colors.red, width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  resetText: { ...typography.body, color: colors.text.primary, fontWeight: '700', marginTop: spacing.xs },
});
