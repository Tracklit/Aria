import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNutrition, NutritionPlan } from '../../src/context/NutritionContext';
import { MacroDonutChart } from '../../src/components/features/MacroDonutChart';
import { MacroBar } from '../../src/components/features/MacroBar';
import { colors, typography, spacing, borderRadius } from '../../src/theme';
import { getNutritionPlan } from '../../src/lib/api';

export default function NutritionPlanDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { deletePlan, updatePlan } = useNutrition();
  const [plan, setPlan] = useState<NutritionPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPlan();
  }, [id]);

  const loadPlan = async () => {
    try {
      const data = await getNutritionPlan(parseInt(id));
      setPlan(data as NutritionPlan);
    } catch (error) {
      console.error('Failed to load plan:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!plan) return;
    await updatePlan(plan.id, { status: plan.status === 'active' ? 'archived' : 'active' });
    setPlan({ ...plan, status: plan.status === 'active' ? 'archived' : 'active' });
  };

  const handleDelete = () => {
    Alert.alert('Delete Plan', 'Are you sure you want to delete this plan?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        if (plan) { await deletePlan(plan.id); router.back(); }
      }},
    ]);
  };

  if (isLoading || !plan) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{plan.title}</Text>
        <TouchableOpacity onPress={handleDelete}>
          <Ionicons name="trash-outline" size={22} color={colors.red} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Donut Chart */}
        <View style={styles.chartSection}>
          <MacroDonutChart
            protein={plan.proteinGrams || 0}
            carbs={plan.carbsGrams || 0}
            fats={plan.fatsGrams || 0}
            totalCalories={plan.calorieTarget || undefined}
            size={160}
            strokeWidth={16}
          />
        </View>

        {/* Macro Breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Macro Breakdown</Text>
          <MacroBar protein={plan.proteinGrams || 0} carbs={plan.carbsGrams || 0} fats={plan.fatsGrams || 0} height={12} />
          <View style={styles.macroRow}>
            <View style={styles.macroItem}>
              <View style={[styles.macroDot, { backgroundColor: colors.primary }]} />
              <Text style={styles.macroLabel}>Protein</Text>
              <Text style={styles.macroValue}>{plan.proteinGrams || 0}g</Text>
            </View>
            <View style={styles.macroItem}>
              <View style={[styles.macroDot, { backgroundColor: colors.yellow }]} />
              <Text style={styles.macroLabel}>Carbs</Text>
              <Text style={styles.macroValue}>{plan.carbsGrams || 0}g</Text>
            </View>
            <View style={styles.macroItem}>
              <View style={[styles.macroDot, { backgroundColor: colors.orange }]} />
              <Text style={styles.macroLabel}>Fats</Text>
              <Text style={styles.macroValue}>{plan.fatsGrams || 0}g</Text>
            </View>
          </View>
        </View>

        {/* Meal Suggestions */}
        {plan.mealSuggestions && plan.mealSuggestions.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Meal Plan</Text>
            {plan.mealSuggestions.map((meal, index) => (
              <View key={index} style={[styles.mealItem, index > 0 && styles.mealDivider]}>
                <View style={styles.mealHeader}>
                  <Text style={styles.mealName}>{meal.meal}</Text>
                  <Text style={styles.mealCalories}>{meal.calories} kcal</Text>
                </View>
                {meal.foods.map((food, fi) => (
                  <Text key={fi} style={styles.foodItem}>• {food}</Text>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        <TouchableOpacity style={styles.archiveButton} onPress={handleArchive}>
          <Ionicons name={plan.status === 'active' ? 'archive-outline' : 'checkmark-circle-outline'} size={20} color={colors.text.secondary} />
          <Text style={styles.archiveText}>{plan.status === 'active' ? 'Archive Plan' : 'Reactivate Plan'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerTitle: { ...typography.body, color: colors.text.primary, fontWeight: '600', flex: 1, textAlign: 'center', marginHorizontal: spacing.md },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { ...typography.body, color: colors.text.secondary },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 40, gap: spacing.md },
  chartSection: { alignItems: 'center', paddingVertical: spacing.lg },
  card: { backgroundColor: colors.background.cardSolid, borderRadius: borderRadius.lg, padding: spacing.md },
  cardTitle: { ...typography.body, color: colors.text.primary, fontWeight: '600', marginBottom: spacing.md },
  macroRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: spacing.md },
  macroItem: { alignItems: 'center', gap: 4 },
  macroDot: { width: 8, height: 8, borderRadius: 4 },
  macroLabel: { ...typography.caption, color: colors.text.secondary },
  macroValue: { ...typography.body, color: colors.text.primary, fontWeight: '600' },
  mealItem: { paddingVertical: spacing.sm },
  mealDivider: { borderTopWidth: 1, borderTopColor: colors.background.secondary },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  mealName: { ...typography.body, color: colors.text.primary, fontWeight: '600' },
  mealCalories: { ...typography.caption, color: colors.primary },
  foodItem: { ...typography.caption, color: colors.text.secondary, marginLeft: spacing.sm, marginVertical: 1 },
  archiveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.md },
  archiveText: { ...typography.body, color: colors.text.secondary },
});
