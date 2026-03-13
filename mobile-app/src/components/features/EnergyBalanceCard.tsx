import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles, useColors, spacing, borderRadius } from '../../theme';
import type { ThemeColors } from '../../theme/colors';

interface EnergyBalanceCardProps {
  caloriesBurned: number | null;
  calorieTarget: number | null;
}

function getBalanceStatus(burned: number, target: number) {
  const diff = burned - target;
  const pct = Math.abs(diff / target) * 100;

  if (pct <= 10) return { label: 'On Target', color: '#32D74B', icon: 'checkmark-circle' as const };
  if (diff > 0) return { label: 'Surplus', color: '#FFD60A', icon: 'arrow-up-circle' as const };
  return { label: 'Deficit', color: '#FF453A', icon: 'arrow-down-circle' as const };
}

const EnergyBalanceCard = React.memo(function EnergyBalanceCard({
  caloriesBurned,
  calorieTarget,
}: EnergyBalanceCardProps) {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);

  if (caloriesBurned == null || calorieTarget == null || calorieTarget <= 0) return null;

  const status = getBalanceStatus(caloriesBurned, calorieTarget);
  const progress = Math.min(caloriesBurned / calorieTarget, 1.5);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Ionicons name="flame" size={18} color={colors.primary} />
        <Text style={styles.title}>Energy Balance</Text>
      </View>

      <View style={styles.valuesRow}>
        <View style={styles.valueBlock}>
          <Text style={styles.valueLabel}>Burned</Text>
          <Text style={styles.value}>{caloriesBurned.toLocaleString()}</Text>
          <Text style={styles.unit}>kcal</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.valueBlock}>
          <Text style={styles.valueLabel}>Target</Text>
          <Text style={styles.value}>{calorieTarget.toLocaleString()}</Text>
          <Text style={styles.unit}>kcal</Text>
        </View>
        <View style={styles.statusBadge}>
          <Ionicons name={status.icon} size={14} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.min(progress * 100, 100)}%` as any,
              backgroundColor: status.color,
            },
          ]}
        />
        {progress > 1 && (
          <View
            style={[
              styles.progressOverflow,
              {
                width: `${Math.min((progress - 1) * 100, 50)}%` as any,
                backgroundColor: status.color,
                opacity: 0.4,
              },
            ]}
          />
        )}
      </View>

      <Text style={styles.progressLabel}>
        {Math.round(progress * 100)}% of daily target
      </Text>
    </View>
  );
});

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.background.cardSolid,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: spacing.md,
    },
    title: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.text.primary,
    },
    valuesRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    valueBlock: {
      alignItems: 'center',
      flex: 1,
    },
    valueLabel: {
      fontSize: 12,
      color: colors.text.secondary,
      marginBottom: 2,
    },
    value: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text.primary,
    },
    unit: {
      fontSize: 11,
      color: colors.text.tertiary,
    },
    divider: {
      width: 1,
      height: 36,
      backgroundColor: colors.background.secondary,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.background.secondary,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: borderRadius.full,
      marginLeft: spacing.sm,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '600',
    },
    progressTrack: {
      height: 6,
      backgroundColor: colors.background.secondary,
      borderRadius: 3,
      flexDirection: 'row',
      overflow: 'hidden',
    },
    progressFill: {
      height: 6,
      borderRadius: 3,
    },
    progressOverflow: {
      height: 6,
    },
    progressLabel: {
      fontSize: 12,
      color: colors.text.tertiary,
      marginTop: 6,
      textAlign: 'center',
    },
  });

export default EnergyBalanceCard;
