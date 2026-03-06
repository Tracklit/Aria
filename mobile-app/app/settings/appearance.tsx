import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeMode } from '../../src/context';
import { useThemedStyles, useColors, typography, spacing, borderRadius } from '../../src/theme';
import { ThemeColors } from '../../src/theme/colors';
import { selectionChanged } from '../../src/utils/haptics';

const THEME_OPTIONS: { value: ThemeMode; label: string; description: string }[] = [
  { value: 'light', label: 'Light', description: 'Always use light appearance' },
  { value: 'dark', label: 'Dark', description: 'Always use dark appearance' },
  { value: 'system', label: 'System', description: 'Match your device settings' },
];

export default function AppearanceScreen() {
  const { themeMode, setThemeMode } = useTheme();
  const styles = useThemedStyles(createStyles);
  const colors = useColors();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appearance</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.content}>
        {THEME_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[styles.optionCard, themeMode === option.value && styles.optionCardSelected]}
            onPress={() => { selectionChanged(); setThemeMode(option.value); }}
          >
            <View style={styles.optionContent}>
              <Text style={styles.optionLabel}>{option.label}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </View>
            <View style={[styles.radio, themeMode === option.value && styles.radioSelected]}>
              {themeMode === option.value && <View style={styles.radioDot} />}
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
