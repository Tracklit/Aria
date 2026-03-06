import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context';
import { useThemedStyles, useColors, typography, spacing, borderRadius } from '../../src/theme';
import { ThemeColors } from '../../src/theme/colors';

const COACHING_STYLES = [
  { value: 'motivational', label: 'Motivational', icon: 'flame-outline' as const, description: 'Encouraging, hype-focused feedback to keep you fired up' },
  { value: 'technical', label: 'Technical', icon: 'analytics-outline' as const, description: 'Data-driven analysis with detailed form and pace breakdowns' },
  { value: 'balanced', label: 'Balanced', icon: 'scale-outline' as const, description: 'Mix of encouragement and technical insights' },
  { value: 'minimal', label: 'Minimal', icon: 'remove-circle-outline' as const, description: 'Brief, essential feedback only — no fluff' },
];

export default function AICoachingScreen() {
  const { preferences, updatePreferences } = useAuth();
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const [selected, setSelected] = useState(preferences?.aiCoachingStyle || 'balanced');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updatePreferences({ aiCoachingStyle: selected });
      router.back();
    } catch (error) {
      console.error('Failed to save coaching style:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Coaching Style</Text>
        <TouchableOpacity onPress={handleSave} disabled={isSaving}>
          <Text style={[styles.saveText, isSaving && { opacity: 0.5 }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {COACHING_STYLES.map((style) => (
          <TouchableOpacity
            key={style.value}
            style={[styles.card, selected === style.value && styles.cardSelected]}
            onPress={() => setSelected(style.value)}
          >
            <View style={[styles.iconCircle, selected === style.value && styles.iconCircleSelected]}>
              <Ionicons name={style.icon} size={24} color={selected === style.value ? colors.primary : colors.text.secondary} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardLabel}>{style.label}</Text>
              <Text style={styles.cardDescription}>{style.description}</Text>
            </View>
            {selected === style.value && (
              <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerTitle: { ...typography.body, color: colors.text.primary, fontWeight: '600' },
  saveText: { ...typography.body, color: colors.primary, fontWeight: '600' },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.sm },
  card: { backgroundColor: colors.background.cardSolid, borderRadius: borderRadius.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  cardSelected: { borderColor: colors.primary },
  iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.background.secondary, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  iconCircleSelected: { backgroundColor: 'rgba(10, 132, 255, 0.15)' },
  cardContent: { flex: 1 },
  cardLabel: { ...typography.body, color: colors.text.primary, fontWeight: '600', marginBottom: 2 },
  cardDescription: { ...typography.caption, color: colors.text.secondary },
});
