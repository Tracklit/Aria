import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
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
  onDelete?: () => void;
  onEdit?: () => void;
  onArchive?: () => void;
  onShare?: () => void;
}

export const NutritionPlanCard: React.FC<NutritionPlanCardProps> = ({ plan, onPress, onDelete, onEdit, onArchive, onShare }) => {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const swipeableRef = React.useRef<Swipeable>(null);

  const renderLeftActions = () => {
    if (!onDelete && !onEdit) return null;
    return (
      <View style={styles.swipeActionsLeft}>
        {onDelete && (
          <TouchableOpacity style={[styles.swipeAction, styles.swipeDelete]} onPress={() => { swipeableRef.current?.close(); onDelete(); }}>
            <Ionicons name="trash-outline" size={20} color="#fff" />
            <Text style={styles.swipeActionText}>Delete</Text>
          </TouchableOpacity>
        )}
        {onEdit && (
          <TouchableOpacity style={[styles.swipeAction, styles.swipeEdit]} onPress={() => { swipeableRef.current?.close(); onEdit(); }}>
            <Ionicons name="create-outline" size={20} color="#fff" />
            <Text style={styles.swipeActionText}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderRightActions = () => {
    if (!onArchive && !onShare) return null;
    return (
      <View style={styles.swipeActionsRight}>
        {onArchive && (
          <TouchableOpacity style={[styles.swipeAction, styles.swipeArchive]} onPress={() => { swipeableRef.current?.close(); onArchive(); }}>
            <Ionicons name="archive-outline" size={20} color="#fff" />
            <Text style={styles.swipeActionText}>Archive</Text>
          </TouchableOpacity>
        )}
        {onShare && (
          <TouchableOpacity style={[styles.swipeAction, styles.swipeShare]} onPress={() => { swipeableRef.current?.close(); onShare(); }}>
            <Ionicons name="share-outline" size={20} color="#fff" />
            <Text style={styles.swipeActionText}>Share</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      overshootLeft={false}
      overshootRight={false}
    >
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
    </Swipeable>
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
  swipeActionsLeft: { flexDirection: 'row', marginBottom: spacing.md },
  swipeActionsRight: { flexDirection: 'row', marginBottom: spacing.md },
  swipeAction: { justifyContent: 'center', alignItems: 'center', width: 72, borderRadius: borderRadius.lg },
  swipeDelete: { backgroundColor: '#FF453A' },
  swipeEdit: { backgroundColor: '#0A84FF' },
  swipeArchive: { backgroundColor: '#FF9F0A' },
  swipeShare: { backgroundColor: '#30D5C8' },
  swipeActionText: { color: '#fff', fontSize: 11, marginTop: 4, fontWeight: '500' },
});
