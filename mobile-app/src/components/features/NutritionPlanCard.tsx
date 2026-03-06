import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useColors, useThemedStyles, typography, spacing, borderRadius } from '../../theme';
import { ThemeColors } from '../../theme/colors';
import { MacroBar } from './MacroBar';

interface NutritionPlanCardProps {
  plan: {
    id: number;
    title: string;
    calorieTarget?: number | null;
    proteinGrams?: number | null;
    carbsGrams?: number | null;
    fatsGrams?: number | null;
    season?: string | null;
    status?: string | null;
  };
  onPress: () => void;
}

export const NutritionPlanCard: React.FC<NutritionPlanCardProps> = ({ plan, onPress }) => {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>{plan.title}</Text>
        {plan.status && (
          <View style={[styles.statusBadge, plan.status === 'active' ? styles.activeBadge : styles.archivedBadge]}>
            <Text style={styles.statusText}>{plan.status}</Text>
          </View>
        )}
      </View>

      {plan.calorieTarget && (
        <Text style={styles.calories}>{plan.calorieTarget} kcal / day</Text>
      )}

      {(plan.proteinGrams || plan.carbsGrams || plan.fatsGrams) && (
        <View style={styles.macroSection}>
          <MacroBar
            protein={plan.proteinGrams || 0}
            carbs={plan.carbsGrams || 0}
            fats={plan.fatsGrams || 0}
          />
          <View style={styles.macroLabels}>
            <Text style={[styles.macroLabel, { color: colors.primary }]}>P: {plan.proteinGrams || 0}g</Text>
            <Text style={[styles.macroLabel, { color: colors.yellow }]}>C: {plan.carbsGrams || 0}g</Text>
            <Text style={[styles.macroLabel, { color: colors.orange }]}>F: {plan.fatsGrams || 0}g</Text>
          </View>
        </View>
      )}

      {plan.season && (
        <View style={styles.seasonBadge}>
          <Text style={styles.seasonText}>{plan.season.replace('_', ' ')}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginLeft: spacing.sm,
  },
  activeBadge: {
    backgroundColor: 'rgba(50, 215, 75, 0.2)',
  },
  archivedBadge: {
    backgroundColor: 'rgba(142, 142, 147, 0.2)',
  },
  statusText: {
    ...typography.caption,
    color: colors.text.secondary,
    textTransform: 'capitalize',
  },
  calories: {
    ...typography.h3,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  macroSection: {
    marginTop: spacing.xs,
  },
  macroLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  macroLabel: {
    ...typography.caption,
  },
  seasonBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
  },
  seasonText: {
    ...typography.caption,
    color: colors.text.secondary,
    textTransform: 'capitalize',
  },
});
