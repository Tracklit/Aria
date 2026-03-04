import React, { useState } from 'react';
import { View, Text, Switch, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../../src/theme';

const VOLUME_LEVELS = [25, 50, 75, 100];

export default function VoiceFeedbackScreen() {
  const [enabled, setEnabled] = useState(false);
  const [volume, setVolume] = useState(75);

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
              value={enabled}
              onValueChange={setEnabled}
              trackColor={{ false: colors.background.secondary, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {enabled && (
          <View style={styles.card}>
            <Text style={styles.label}>Volume</Text>
            <View style={styles.volumeRow}>
              {VOLUME_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[styles.volumeButton, volume === level && styles.volumeButtonSelected]}
                  onPress={() => setVolume(level)}
                >
                  <Text style={[styles.volumeText, volume === level && styles.volumeTextSelected]}>{level}%</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <Text style={styles.footnote}>
          Voice feedback is saved locally and will be available in a future update.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerTitle: { ...typography.body, color: colors.text.primary, fontWeight: '600' },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.md },
  card: { backgroundColor: colors.background.cardSolid, borderRadius: borderRadius.lg, padding: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowContent: { flex: 1, marginRight: spacing.md },
  label: { ...typography.body, color: colors.text.primary, fontWeight: '600' },
  description: { ...typography.caption, color: colors.text.secondary, marginTop: 2 },
  volumeRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  volumeButton: { flex: 1, paddingVertical: spacing.sm, borderRadius: borderRadius.md, backgroundColor: colors.background.secondary, alignItems: 'center' },
  volumeButtonSelected: { backgroundColor: colors.primary },
  volumeText: { ...typography.caption, color: colors.text.secondary, fontWeight: '600' },
  volumeTextSelected: { color: colors.text.primary },
  footnote: { ...typography.caption, color: colors.text.tertiary, textAlign: 'center', marginTop: spacing.sm },
});
