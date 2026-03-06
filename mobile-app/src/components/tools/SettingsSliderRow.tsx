import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { useThemedStyles, useColors, typography, spacing, borderRadius } from '../../theme';
import { ThemeColors } from '../../theme/colors';

interface SettingsSliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  formatValue?: (v: number) => string;
  onValueChange: (v: number) => void;
  enabled?: boolean;
  onEnabledChange?: (v: boolean) => void;
}

export function SettingsSliderRow({
  label, value, min, max, step, formatValue, onValueChange, enabled, onEnabledChange,
}: SettingsSliderRowProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const hasToggle = onEnabledChange !== undefined;
  const isDisabled = hasToggle && !enabled;
  const displayValue = formatValue ? formatValue(value) : value.toFixed(1);

  return (
    <View style={[styles.card, isDisabled && styles.cardDisabled]}>
      <View style={styles.topRow}>
        <Text style={[styles.label, isDisabled && styles.labelDisabled]}>{label}</Text>
        <View style={styles.rightSide}>
          <Text style={[styles.value, isDisabled && styles.labelDisabled]}>{displayValue}</Text>
          {hasToggle && (
            <Switch
              value={enabled}
              onValueChange={onEnabledChange}
              trackColor={{ false: colors.background.secondary, true: colors.primary }}
              thumbColor="#FFFFFF"
            />
          )}
        </View>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        onValueChange={onValueChange}
        minimumTrackTintColor={isDisabled ? colors.text.tertiary : colors.primary}
        maximumTrackTintColor={colors.background.secondary}
        thumbTintColor={isDisabled ? colors.text.tertiary : colors.primary}
        disabled={isDisabled}
      />
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
  cardDisabled: { opacity: 0.5 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rightSide: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { ...typography.body, color: colors.text.primary, fontWeight: '600' },
  labelDisabled: { color: colors.text.tertiary },
  value: { ...typography.caption, color: colors.primary, fontWeight: '700' },
  slider: { width: '100%', height: 40, marginTop: spacing.xs },
});
