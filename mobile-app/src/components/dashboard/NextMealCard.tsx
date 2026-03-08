import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, spacing, borderRadius } from '../../theme';

interface NextMealCardProps {
  meal: string;
  foods: string[];
  calories: number;
  macros: { protein: number; carbs: number; fats: number };
  timeWindow: string;
  isTomorrow?: boolean;
  loggedStatus?: 'completed' | 'skipped' | null;
  onPress?: () => void;
  onComplete?: () => Promise<void>;
  onSkip?: () => Promise<void>;
}

const NextMealCard = React.memo(function NextMealCard({
  meal,
  foods,
  calories,
  macros,
  timeWindow,
  isTomorrow,
  loggedStatus,
  onPress,
  onComplete,
  onSkip,
}: NextMealCardProps) {
  const colors = useColors();
  const [isLogging, setIsLogging] = useState(false);

  const handleAction = async (action: (() => Promise<void>) | undefined) => {
    if (!action || isLogging) return;
    setIsLogging(true);
    try {
      await action();
    } finally {
      setIsLogging(false);
    }
  };

  const isLogged = loggedStatus === 'completed' || loggedStatus === 'skipped';

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: colors.background.cardSolid },
        isLogged && styles.cardLogged,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {isTomorrow && (
        <View style={styles.tomorrowBadge}>
          <Ionicons name="calendar-outline" size={12} color="#FF9F0A" />
          <Text style={styles.tomorrowText}>TOMORROW</Text>
        </View>
      )}
      <View style={styles.header}>
        <View style={[styles.iconWrap, {
          backgroundColor: loggedStatus === 'completed'
            ? 'rgba(76,175,80,0.25)'
            : loggedStatus === 'skipped'
              ? 'rgba(255,69,58,0.15)'
              : 'rgba(76,175,80,0.15)',
        }]}>
          {loggedStatus === 'completed' ? (
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
          ) : loggedStatus === 'skipped' ? (
            <Ionicons name="close-circle" size={20} color="#FF453A" />
          ) : (
            <Ionicons name="restaurant-outline" size={20} color="#4CAF50" />
          )}
        </View>
        <View style={styles.headerText}>
          <Text style={[
            styles.mealName,
            { color: colors.text.primary },
            loggedStatus === 'skipped' && styles.mealNameSkipped,
          ]}>
            {meal}
          </Text>
          <Text style={[styles.timeWindow, { color: colors.text.tertiary }]}>
            {isLogged ? (loggedStatus === 'completed' ? 'Completed' : 'Skipped') : timeWindow}
          </Text>
        </View>
        <View style={styles.caloriesWrap}>
          <Text style={[styles.caloriesValue, { color: colors.text.primary }]}>{calories}</Text>
          <Text style={[styles.caloriesUnit, { color: colors.text.tertiary }]}>cal</Text>
        </View>
      </View>
      {foods.length > 0 && (
        <Text
          style={[
            styles.foods,
            { color: colors.text.secondary },
            loggedStatus === 'skipped' && styles.foodsSkipped,
          ]}
          numberOfLines={2}
        >
          {foods.slice(0, 3).join(', ')}
        </Text>
      )}
      <View style={styles.macrosRow}>
        <View style={[styles.macroPill, { backgroundColor: 'rgba(0,229,255,0.12)' }]}>
          <Text style={[styles.macroText, { color: colors.primary }]}>P {macros.protein}g</Text>
        </View>
        <View style={[styles.macroPill, { backgroundColor: 'rgba(255,214,10,0.12)' }]}>
          <Text style={[styles.macroText, { color: colors.yellow }]}>C {macros.carbs}g</Text>
        </View>
        <View style={[styles.macroPill, { backgroundColor: 'rgba(255,159,10,0.12)' }]}>
          <Text style={[styles.macroText, { color: colors.orange }]}>F {macros.fats}g</Text>
        </View>
      </View>

      {/* Action buttons */}
      {!isTomorrow && !isLogged && (onComplete || onSkip) && (
        <View style={styles.actionsRow}>
          {isLogging ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              {onComplete && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.completeButton]}
                  onPress={() => handleAction(onComplete)}
                >
                  <Ionicons name="checkmark-circle-outline" size={18} color="#4CAF50" />
                  <Text style={[styles.actionText, { color: '#4CAF50' }]}>Done</Text>
                </TouchableOpacity>
              )}
              {onSkip && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.skipButton]}
                  onPress={() => handleAction(onSkip)}
                >
                  <Ionicons name="close-circle-outline" size={18} color="#FF453A" />
                  <Text style={[styles.actionText, { color: '#FF453A' }]}>Skip</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  cardLogged: {
    opacity: 0.85,
  },
  tomorrowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,159,10,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 8,
  },
  tomorrowText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF9F0A',
    letterSpacing: 0.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '600',
  },
  mealNameSkipped: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  timeWindow: {
    fontSize: 13,
    marginTop: 2,
  },
  caloriesWrap: {
    alignItems: 'flex-end',
  },
  caloriesValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  caloriesUnit: {
    fontSize: 12,
  },
  foods: {
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },
  foodsSkipped: {
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  macrosRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  macroPill: {
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  macroText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    justifyContent: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  completeButton: {
    backgroundColor: 'rgba(76,175,80,0.12)',
  },
  skipButton: {
    backgroundColor: 'rgba(255,69,58,0.1)',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default NextMealCard;
