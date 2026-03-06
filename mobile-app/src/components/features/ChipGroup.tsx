import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useThemedStyles, typography, spacing, borderRadius } from '../../theme';
import { ThemeColors } from '../../theme/colors';

interface ChipGroupProps {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  label?: string;
}

export const ChipGroup: React.FC<ChipGroupProps> = ({ options, selected, onToggle, label }) => {
  const styles = useThemedStyles(createStyles);

  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {options.map((option) => {
          const isSelected = selected.includes(option);
          return (
            <TouchableOpacity
              key={option}
              style={[styles.chip, isSelected ? styles.chipSelected : styles.chipUnselected]}
              onPress={() => onToggle(option)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, isSelected ? styles.chipTextSelected : styles.chipTextUnselected]}>
                {option.replace(/_/g, ' ')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  label: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scrollContent: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  chipSelected: {
    backgroundColor: colors.chip.selected,
  },
  chipUnselected: {
    backgroundColor: colors.chip.unselected,
  },
  chipText: {
    ...typography.caption,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  chipTextSelected: {
    color: colors.text.primary,
  },
  chipTextUnselected: {
    color: colors.text.secondary,
  },
});
