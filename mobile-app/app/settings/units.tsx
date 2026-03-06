import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context';
import { useThemedStyles, useColors, typography, spacing, borderRadius } from '../../src/theme';
import { ThemeColors } from '../../src/theme/colors';

const UNIT_OPTIONS = [
  { value: 'metric', label: 'Metric', description: 'Kilometers, kilograms, centimeters' },
  { value: 'imperial', label: 'Imperial', description: 'Miles, pounds, inches' },
] as const;

export default function UnitsScreen() {
  const { profile, updateProfile } = useAuth();
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const [selected, setSelected] = useState<'imperial' | 'metric'>((profile?.units as 'imperial' | 'metric') || 'imperial');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile?.units === 'imperial' || profile?.units === 'metric') {
      setSelected(profile.units);
    }
  }, [profile?.units]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({ units: selected });
      router.back();
    } catch (error) {
      console.error('Failed to save units:', error);
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
        <Text style={styles.headerTitle}>Units of Measure</Text>
        <TouchableOpacity onPress={handleSave} disabled={isSaving}>
          <Text style={[styles.saveText, isSaving && { opacity: 0.5 }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {UNIT_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[styles.optionCard, selected === option.value && styles.optionCardSelected]}
            onPress={() => setSelected(option.value)}
          >
            <View style={styles.optionContent}>
              <Text style={styles.optionLabel}>{option.label}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </View>
            <View style={[styles.radio, selected === option.value && styles.radioSelected]}>
              {selected === option.value && <View style={styles.radioDot} />}
            </View>
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
  optionCard: { backgroundColor: colors.background.cardSolid, borderRadius: borderRadius.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  optionCardSelected: { borderColor: colors.primary },
  optionContent: { flex: 1 },
  optionLabel: { ...typography.body, color: colors.text.primary, fontWeight: '600', marginBottom: 2 },
  optionDescription: { ...typography.caption, color: colors.text.secondary },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.text.tertiary, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: colors.primary },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
});
