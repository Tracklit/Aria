import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useThemedStyles, useColors, typography, spacing, borderRadius } from '../../theme';
import { ThemeColors } from '../../theme/colors';

interface SettingsToggleRowProps {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
  disabled?: boolean;
}

export function SettingsToggleRow({ label, description, value, onValueChange, disabled }: SettingsToggleRowProps) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();

  return (
    <View style={styles.card}>
      <View style={styles.left}>
        <Text style={styles.label}>{label}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.background.secondary, true: colors.primary }}
        thumbColor="#FFFFFF"
        disabled={disabled}
      />
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  left: { flex: 1, marginRight: spacing.md },
  label: { ...typography.body, color: colors.text.primary, fontWeight: '600' },
  description: { ...typography.caption, color: colors.text.secondary, marginTop: 2 },
});
