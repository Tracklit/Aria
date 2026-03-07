import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, spacing, borderRadius } from '../../theme';

interface NextMealCardProps {
  meal: string;
  foods: string[];
  calories: number;
  macros: { protein: number; carbs: number; fats: number };
  timeWindow: string;
  onPress?: () => void;
}

const NextMealCard = React.memo(function NextMealCard({
  meal,
  foods,
  calories,
  macros,
  timeWindow,
  onPress,
}: NextMealCardProps) {
  const colors = useColors();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.background.cardSolid }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: 'rgba(76,175,80,0.15)' }]}>
          <Ionicons name="restaurant-outline" size={20} color="#4CAF50" />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.mealName, { color: colors.text.primary }]}>{meal}</Text>
          <Text style={[styles.timeWindow, { color: colors.text.tertiary }]}>{timeWindow}</Text>
        </View>
        <View style={styles.caloriesWrap}>
          <Text style={[styles.caloriesValue, { color: colors.text.primary }]}>{calories}</Text>
          <Text style={[styles.caloriesUnit, { color: colors.text.tertiary }]}>cal</Text>
        </View>
      </View>
      {foods.length > 0 && (
        <Text style={[styles.foods, { color: colors.text.secondary }]} numberOfLines={2}>
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
});

export default NextMealCard;
