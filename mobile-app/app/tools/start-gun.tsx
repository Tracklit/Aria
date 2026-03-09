import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { impactLight, impactMedium, impactHeavy, notificationWarning } from '../../src/utils/haptics';
import { useThemedStyles, useColors, typography, spacing, borderRadius } from '../../src/theme';
import { ThemeColors } from '../../src/theme/colors';
import { useToolSettings } from '../../src/hooks/useToolSettings';
import { StartGunSettings, DEFAULT_START_GUN, GunSoundOption } from '../../src/types/toolSettings';
import { ToolSettingsModal } from '../../src/components/tools/ToolSettingsModal';
import { SettingsToggleRow } from '../../src/components/tools/SettingsToggleRow';
import { SettingsSliderRow } from '../../src/components/tools/SettingsSliderRow';
import { SettingsChipRow } from '../../src/components/tools/SettingsChipRow';

type Phase = 'idle' | 'marks' | 'set' | 'bang' | 'done';

const VOICE_FILES = {
  default: { marks: require('../../assets/audio/on-your-marks.mp3'), set: require('../../assets/audio/set.mp3') },
  custom: { marks: require('../../assets/audio/custom-on-your-marks.mp3'), set: require('../../assets/audio/custom-set.mp3') },
};

// Compensates for different recorded loudness levels across sound files
const SOUND_VOLUME_MULTIPLIERS: Record<string, number> = {
  'bang': 1.0,
  'gun-shot': 1.0,
  'gun-shot-reverb': 1.4,
  'gun-shot-new': 1.0,
  'starting-pistol': 1.2,
  'custom-bang': 1.0,
};

const GUN_SOUND_FILES: Record<GunSoundOption, any> = {
  'bang': require('../../assets/audio/bang.mp3'),
  'gun-shot': require('../../assets/audio/gun-shot.mp3'),
  'gun-shot-reverb': require('../../assets/audio/gun-shot-reverb.mp3'),
  'gun-shot-new': require('../../assets/audio/gun-shot-new.mp3'),
  'starting-pistol': require('../../assets/audio/starting-pistol.mp3'),
  'custom-bang': require('../../assets/audio/custom-bang.mp3'),
};

export default function StartGunScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const { settings, update, reset: resetSettings } = useToolSettings<StartGunSettings>('aria_startgun_settings', DEFAULT_START_GUN);
  const [showSettings, setShowSettings] = useState(false);

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

  const [phase, setPhase] = useState<Phase>('idle');
  const [flash, setFlash] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      shouldDuckAndroid: false,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      allowsRecordingIOS: false,
      playThroughEarpieceAndroid: false,
    });
    return () => {
      if (soundRef.current) soundRef.current.unloadAsync();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

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

  const playSound = async (file: any, soundKey?: string): Promise<void> => {
    if (soundRef.current) await soundRef.current.unloadAsync();
    const multiplier = soundKey ? (SOUND_VOLUME_MULTIPLIERS[soundKey] ?? 1.0) : 1.0;
    const finalVolume = Math.min(1.0, (settings.volume / 10) * multiplier);
    const { sound } = await Audio.Sound.createAsync(file, { volume: finalVolume });
    soundRef.current = sound;
    await sound.playAsync();
  };

  const startSequence = async () => {
    impactMedium();
    setPhase('marks');
    impactLight();
    await playSound(VOICE_FILES[settings.voice].marks);

    const marksToSetDelay = settings.marksToSetEnabled ? settings.marksToSetDelay * 1000 : 3000;

    timeoutRef.current = setTimeout(async () => {
      setPhase('set');
      impactMedium();
      await playSound(VOICE_FILES[settings.voice].set);

      const baseDelay = settings.setToGunEnabled ? settings.setToGunDelay * 1000 : 2000;
      const randomExtra = settings.randomRangeEnabled ? Math.random() * settings.randomRange * 1000 : 0;
      const delay = baseDelay + randomExtra;

      timeoutRef.current = setTimeout(async () => {
        setPhase('bang');
        impactHeavy();
        if (settings.gunFlash) setFlash(true);
        await playSound(GUN_SOUND_FILES[settings.gunSound], settings.gunSound);
        if (settings.gunFlash) setTimeout(() => setFlash(false), 150);
        setTimeout(() => setPhase('done'), 1000);
      }, delay);
    }, marksToSetDelay);
  };

  const resetSequence = () => {
    notificationWarning();
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
  const phaseIndex = PHASE_STEPS.findIndex(s => s.key === phase);

  return (
    <SafeAreaView style={[styles.container, flash && styles.flashBg]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { resetSequence(); router.back(); }}>
          <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Start Gun</Text>
        <TouchableOpacity onPress={() => setShowSettings(true)}>
          <Ionicons name="settings-outline" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.stepContainer}>
          {PHASE_STEPS.map((step, i) => {
            const isActive = phaseIndex >= i;
            const dotColor = isActive ? PHASE_COLORS[step.key] : colors.background.cardSolid;
            return (
              <View key={step.key} style={styles.step}>
                <View style={[styles.dot, { backgroundColor: dotColor, borderColor: isActive ? dotColor : colors.text.tertiary }]} />
                <Text style={[styles.stepLabel, isActive && { color: PHASE_COLORS[step.key] }]}>{step.label}</Text>
                {i < PHASE_STEPS.length - 1 && (
                  <View style={[styles.line, isActive && phaseIndex > i && { backgroundColor: PHASE_COLORS[PHASE_STEPS[i + 1].key] }]} />
                )}
              </View>
            );
          })}
        </View>

        <Text style={[styles.phaseText, { color: PHASE_COLORS[phase] }]}>{getPhaseText()}</Text>
        {phase === 'marks' && <View testID="tools.start_gun.state_marks" />}
        {phase === 'set' && <View testID="tools.start_gun.state_set" />}
        {phase === 'bang' && <View testID="tools.start_gun.state_bang" />}

        {showStartButton ? (
          <View style={styles.buttonWrapper}>
            <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }], opacity: pulseOpacity }]} />
            <TouchableOpacity style={styles.startButton} onPress={startSequence} testID="tools.start_gun.start">
              <Ionicons name="play" size={40} color={colors.text.primary} />
              <Text style={styles.startText}>START</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.resetButton} onPress={resetSequence} testID="tools.start_gun.stop">
            <Ionicons name="stop" size={32} color={colors.text.primary} />
            <Text style={styles.resetText}>RESET</Text>
          </TouchableOpacity>
        )}
      </View>

      <ToolSettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        title="Start Gun Settings"
        onReset={resetSettings}
      >
        <SettingsToggleRow
          label="Enable"
          description="Master toggle for start gun"
          value={settings.enabled}
          onValueChange={(v) => update({ enabled: v })}
        />
        <SettingsChipRow
          label="Voice"
          options={[
            { label: 'Default', value: 'default' as const },
            { label: 'Custom', value: 'custom' as const },
          ]}
          selected={settings.voice}
          onSelect={(v) => update({ voice: v })}
        />
        <SettingsChipRow
          label="Gun Sound"
          options={[
            { label: 'Bang', value: 'bang' as const },
            { label: 'Gun Shot', value: 'gun-shot' as const },
            { label: 'Reverb', value: 'gun-shot-reverb' as const },
            { label: 'Pistol', value: 'starting-pistol' as const },
            { label: 'HQ Shot', value: 'gun-shot-new' as const },
            { label: 'Custom Bang', value: 'custom-bang' as const },
          ]}
          selected={settings.gunSound}
          onSelect={(v) => update({ gunSound: v })}
        />
        <SettingsToggleRow
          label="Gun Flash"
          description="Flash the screen on fire"
          value={settings.gunFlash}
          onValueChange={(v) => update({ gunFlash: v })}
        />
        <SettingsSliderRow
          label="Volume"
          value={settings.volume}
          min={0}
          max={10}
          step={0.5}
          formatValue={(v) => v.toFixed(1)}
          onValueChange={(v) => update({ volume: v })}
        />
        <SettingsSliderRow
          label="Marks to Set Delay"
          value={settings.marksToSetDelay}
          min={1}
          max={20}
          step={0.5}
          formatValue={(v) => `${v.toFixed(1)}s`}
          onValueChange={(v) => update({ marksToSetDelay: v })}
          enabled={settings.marksToSetEnabled}
          onEnabledChange={(v) => update({ marksToSetEnabled: v })}
        />
        <SettingsSliderRow
          label="Set to Gun Delay"
          value={settings.setToGunDelay}
          min={0.5}
          max={10}
          step={0.5}
          formatValue={(v) => `${v.toFixed(1)}s`}
          onValueChange={(v) => update({ setToGunDelay: v })}
          enabled={settings.setToGunEnabled}
          onEnabledChange={(v) => update({ setToGunEnabled: v })}
        />
        <SettingsSliderRow
          label="Random Range"
          value={settings.randomRange}
          min={0}
          max={5}
          step={0.1}
          formatValue={(v) => `${v.toFixed(1)}s`}
          onValueChange={(v) => update({ randomRange: v })}
          enabled={settings.randomRangeEnabled}
          onEnabledChange={(v) => update({ randomRangeEnabled: v })}
        />
      </ToolSettingsModal>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  flashBg: { backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerTitle: { ...typography.h2, color: colors.text.primary },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  phaseText: { fontSize: 42, fontWeight: '700', marginBottom: spacing.xl * 2, textAlign: 'center' },
  buttonWrapper: { alignItems: 'center', justifyContent: 'center' },
  pulseRing: { position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 2, borderColor: colors.green },
  startButton: { backgroundColor: colors.green, width: 140, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center' },
  startText: { ...typography.body, color: colors.text.primary, fontWeight: '700', marginTop: spacing.xs },
  resetButton: { backgroundColor: colors.red, width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  resetText: { ...typography.body, color: colors.text.primary, fontWeight: '700', marginTop: spacing.xs },
  stepContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl * 2, gap: 0 },
  step: { alignItems: 'center', flexDirection: 'row' },
  dot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { ...typography.caption, color: colors.text.tertiary, position: 'absolute', top: 34, width: 50, textAlign: 'center' },
  line: { width: 40, height: 2, backgroundColor: colors.background.cardSolid, marginHorizontal: spacing.sm },
});
