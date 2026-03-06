import React, { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles, useColors, typography, spacing, borderRadius } from '../../src/theme';
import { ThemeColors } from '../../src/theme/colors';
import {
  getVoiceSettings,
  saveVoiceSettings,
  speak,
  stopSpeaking,
  type VoiceSettings,
} from '../../src/services/voiceFeedback';

const RATE_OPTIONS = [
  { label: '0.75x', value: 0.75 },
  { label: '1x', value: 1.0 },
  { label: '1.25x', value: 1.25 },
  { label: '1.5x', value: 1.5 },
];

const VOLUME_LEVELS = [
  { label: '25%', value: 0.25 },
  { label: '50%', value: 0.5 },
  { label: '75%', value: 0.75 },
  { label: '100%', value: 1.0 },
];

export default function VoiceFeedbackScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const [settings, setSettings] = useState<VoiceSettings | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    getVoiceSettings().then(setSettings);
    return () => stopSpeaking();
  }, []);

  const updateSettings = (patch: Partial<VoiceSettings>) => {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    saveVoiceSettings(next);
  };

  const handleTestVoice = async () => {
    if (!settings) return;
    setTesting(true);
    // Temporarily force enabled so speak() works during test
    const prev = settings.enabled;
    await saveVoiceSettings({ ...settings, enabled: true });
    await speak('Ready, set, go!');
    // Restore original enabled state after a short delay
    if (!prev) {
      setTimeout(async () => {
        await saveVoiceSettings(settings);
      }, 2000);
    }
    setTesting(false);
  };

  if (!settings) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Voice Feedback</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowContent}>
              <Text style={styles.label}>Enable Voice Feedback</Text>
              <Text style={styles.description}>Audio cues during workouts</Text>
            </View>
            <Switch
              value={settings.enabled}
              onValueChange={(enabled) => updateSettings({ enabled })}
              trackColor={{ false: colors.background.secondary, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {settings.enabled && (
          <>
            <View style={styles.card}>
              <Text style={styles.label}>Volume</Text>
              <View style={styles.chipRow}>
                {VOLUME_LEVELS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.chip, settings.volume === opt.value && styles.chipSelected]}
                    onPress={() => updateSettings({ volume: opt.value })}
                  >
                    <Text style={[styles.chipText, settings.volume === opt.value && styles.chipTextSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>Speech Rate</Text>
              <View style={styles.chipRow}>
                {RATE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.chip, settings.rate === opt.value && styles.chipSelected]}
                    onPress={() => updateSettings({ rate: opt.value })}
                  >
                    <Text style={[styles.chipText, settings.rate === opt.value && styles.chipTextSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={styles.testButton}
              onPress={handleTestVoice}
              disabled={testing}
            >
              <Ionicons name="volume-high" size={20} color={colors.text.primary} />
              <Text style={styles.testButtonText}>
                {testing ? 'Speaking...' : 'Test Voice'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.footnote}>
          Voice feedback provides audio coaching cues during live workout sessions.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerTitle: { ...typography.body, color: colors.text.primary, fontWeight: '600' },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.md },
  card: { backgroundColor: colors.background.cardSolid, borderRadius: borderRadius.lg, padding: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowContent: { flex: 1, marginRight: spacing.md },
  label: { ...typography.body, color: colors.text.primary, fontWeight: '600' },
  description: { ...typography.caption, color: colors.text.secondary, marginTop: 2 },
  chipRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  chip: { flex: 1, paddingVertical: spacing.sm, borderRadius: borderRadius.md, backgroundColor: colors.background.secondary, alignItems: 'center' },
  chipSelected: { backgroundColor: colors.primary },
  chipText: { ...typography.caption, color: colors.text.secondary, fontWeight: '600' },
  chipTextSelected: { color: colors.text.primary },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  testButtonText: { ...typography.body, color: colors.text.primary, fontWeight: '600' },
  footnote: { ...typography.caption, color: colors.text.tertiary, textAlign: 'center', marginTop: spacing.sm },
});
