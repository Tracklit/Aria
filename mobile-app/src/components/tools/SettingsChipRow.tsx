import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useThemedStyles, useColors, typography, spacing, borderRadius } from '../../theme';
import { ThemeColors } from '../../theme/colors';

interface ChipOption<T extends string | number> {
  label: string;
  value: T;
}

interface SettingsChipRowProps<T extends string | number> {
  label: string;
  options: ChipOption<T>[];
  selected: T;
  onSelect: (val: T) => void;
}

export function SettingsChipRow<T extends string | number>({ label, options, selected, onSelect }: SettingsChipRowProps<T>) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();

  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map((opt) => (
          <TouchableOpacity
            key={String(opt.value)}
            style={[styles.chip, selected === opt.value && styles.chipSelected]}
            onPress={() => onSelect(opt.value)}
            activeOpacity={0.7}
          >
            <Text style={[styles.chipText, selected === opt.value && styles.chipTextSelected]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  label: { ...typography.body, color: colors.text.primary, fontWeight: '600', marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flex: 1,
    minWidth: 60,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
  },
  chipSelected: { backgroundColor: colors.primary },
  chipText: { ...typography.caption, color: colors.text.secondary, fontWeight: '600' },
  chipTextSelected: { color: colors.text.primary },
});
