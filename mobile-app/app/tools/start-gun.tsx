import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { colors, typography, spacing, borderRadius } from '../../src/theme';

type Phase = 'idle' | 'marks' | 'set' | 'bang' | 'done';

export default function StartGunScreen() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [randomize, setRandomize] = useState(true);
  const [flash, setFlash] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    return () => {
      if (soundRef.current) soundRef.current.unloadAsync();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

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
        <Text style={styles.phaseText}>{getPhaseText()}</Text>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Randomize set-to-gun delay</Text>
          <Switch value={randomize} onValueChange={setRandomize} trackColor={{ true: colors.primary }} disabled={phase !== 'idle'} />
        </View>

        {phase === 'idle' || phase === 'done' ? (
          <TouchableOpacity style={styles.startButton} onPress={startSequence}>
            <Ionicons name="play" size={40} color={colors.text.primary} />
            <Text style={styles.startText}>START</Text>
          </TouchableOpacity>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  flashBg: { backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerTitle: { ...typography.h2, color: colors.text.primary },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  phaseText: { ...typography.h1, color: colors.text.primary, fontSize: 36, marginBottom: spacing.xl * 2 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', backgroundColor: colors.background.cardSolid, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.xl },
  settingLabel: { ...typography.body, color: colors.text.primary },
  startButton: { backgroundColor: colors.green, width: 140, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center' },
  startText: { ...typography.body, color: colors.text.primary, fontWeight: '700', marginTop: spacing.xs },
  resetButton: { backgroundColor: colors.red, width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  resetText: { ...typography.body, color: colors.text.primary, fontWeight: '700', marginTop: spacing.xs },
});
