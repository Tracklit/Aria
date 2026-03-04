import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNutrition, NutritionPlan } from '../../src/context/NutritionContext';
import { LinearGradient } from 'expo-linear-gradient';
import { MacroDonutChart } from '../../src/components/features/MacroDonutChart';
import { MacroBar } from '../../src/components/features/MacroBar';
import { colors, typography, spacing, borderRadius } from '../../src/theme';
import { getNutritionPlan } from '../../src/lib/api';

function getMealIcon(mealName: string): keyof typeof Ionicons.glyphMap {
  const name = mealName.toLowerCase();
  if (name.includes('breakfast')) return 'sunny-outline';
  if (name.includes('mid-morning') || name.includes('snack')) return 'partly-sunny-outline';
  if (name.includes('lunch')) return 'restaurant-outline';
  if (name.includes('dinner')) return 'moon-outline';
  return 'restaurant-outline';
}

export default function NutritionPlanDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { plans, deletePlan, updatePlan } = useNutrition();
  const [plan, setPlan] = useState<NutritionPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editCalories, setEditCalories] = useState('');
  const [editProtein, setEditProtein] = useState('');
  const [editCarbs, setEditCarbs] = useState('');
  const [editFats, setEditFats] = useState('');

  useEffect(() => {
    loadPlan();
  }, [id]);

  const loadPlan = async () => {
    try {
      const data = await getNutritionPlan(parseInt(id));
      setPlan(data as NutritionPlan);
    } catch (error) {
      // Fallback to context plans if API fails
      const contextPlan = plans.find(p => p.id === parseInt(id));
      if (contextPlan) {
        setPlan(contextPlan);
      } else {
        console.error('Failed to load plan:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const startEditing = () => {
    if (!plan) return;
    setEditTitle(plan.title || '');
    setEditCalories(plan.calorieTarget?.toString() || '');
    setEditProtein(plan.proteinGrams?.toString() || '');
    setEditCarbs(plan.carbsGrams?.toString() || '');
    setEditFats(plan.fatsGrams?.toString() || '');
    setIsEditing(true);
  };

  const saveEdits = async () => {
    if (!plan) return;
    const updates: Partial<NutritionPlan> = {
      title: editTitle,
      calorieTarget: parseInt(editCalories) || 0,
      proteinGrams: parseInt(editProtein) || 0,
      carbsGrams: parseInt(editCarbs) || 0,
      fatsGrams: parseInt(editFats) || 0,
    };
    await updatePlan(plan.id, updates);
    setPlan({ ...plan, ...updates });
    setIsEditing(false);
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

  const isActive = plan.status === 'active';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{plan.title}</Text>
        <View style={styles.headerActions}>
          {isEditing ? (
            <TouchableOpacity onPress={saveEdits} style={styles.saveButton}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={startEditing} style={{ marginRight: spacing.sm }}>
              <Ionicons name="pencil-outline" size={22} color={colors.text.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={isEditing ? () => setIsEditing(false) : handleDelete}>
            <Ionicons name={isEditing ? 'close' : 'trash-outline'} size={22} color={isEditing ? colors.text.secondary : colors.red} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Gradient Header */}
        <LinearGradient
          colors={['#1a237e', '#0d47a1', '#0A0A0A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.summaryCard}
        >
          <View style={styles.summaryTop}>
            {isEditing ? (
              <TextInput
                style={[styles.summaryTitle, styles.editInput]}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Plan title"
                placeholderTextColor={colors.text.tertiary}
              />
            ) : (
              <Text style={styles.summaryTitle}>{plan.title}</Text>
            )}
            <View style={[styles.statusBadge, isActive ? styles.statusActive : styles.statusArchived]}>
              <Text style={[styles.statusText, isActive ? styles.statusTextActive : styles.statusTextArchived]}>
                {isActive ? 'Active' : 'Archived'}
              </Text>
            </View>
          </View>
          {isEditing ? (
            <View style={styles.calorieRow}>
              <TextInput
                style={[styles.calorieValue, styles.editInput, { flex: 0, minWidth: 100 }]}
                value={editCalories}
                onChangeText={setEditCalories}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.text.tertiary}
              />
              <Text style={styles.calorieUnit}>kcal / day</Text>
            </View>
          ) : plan.calorieTarget ? (
            <View style={styles.calorieRow}>
              <Text style={styles.calorieValue}>{plan.calorieTarget.toLocaleString()}</Text>
              <Text style={styles.calorieUnit}>kcal / day</Text>
            </View>
          ) : null}
        </LinearGradient>

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
              {isEditing ? (
                <TextInput
                  style={[styles.macroValue, styles.editInputSmall]}
                  value={editProtein}
                  onChangeText={setEditProtein}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.text.tertiary}
                />
              ) : (
                <Text style={styles.macroValue}>{plan.proteinGrams || 0}g</Text>
              )}
            </View>
            <View style={styles.macroItem}>
              <View style={[styles.macroDot, { backgroundColor: colors.yellow }]} />
              <Text style={styles.macroLabel}>Carbs</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.macroValue, styles.editInputSmall]}
                  value={editCarbs}
                  onChangeText={setEditCarbs}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.text.tertiary}
                />
              ) : (
                <Text style={styles.macroValue}>{plan.carbsGrams || 0}g</Text>
              )}
            </View>
            <View style={styles.macroItem}>
              <View style={[styles.macroDot, { backgroundColor: colors.orange }]} />
              <Text style={styles.macroLabel}>Fats</Text>
              {isEditing ? (
                <TextInput
                  style={[styles.macroValue, styles.editInputSmall]}
                  value={editFats}
                  onChangeText={setEditFats}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={colors.text.tertiary}
                />
              ) : (
                <Text style={styles.macroValue}>{plan.fatsGrams || 0}g</Text>
              )}
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
                  <View style={styles.mealNameRow}>
                    <View style={styles.mealIconBg}>
                      <Ionicons name={getMealIcon(meal.meal)} size={16} color={colors.teal} />
                    </View>
                    <Text style={styles.mealName}>{meal.meal}</Text>
                  </View>
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
          <Ionicons name={isActive ? 'archive-outline' : 'checkmark-circle-outline'} size={20} color={colors.text.secondary} />
          <Text style={styles.archiveText}>{isActive ? 'Archive Plan' : 'Reactivate Plan'}</Text>
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
  // Summary card
  summaryCard: { borderRadius: borderRadius.lg, padding: spacing.lg },
  summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  summaryTitle: { ...typography.h2, color: colors.text.primary, flex: 1, marginRight: spacing.sm },
  statusBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  statusActive: { backgroundColor: 'rgba(50, 215, 75, 0.15)' },
  statusArchived: { backgroundColor: 'rgba(255, 255, 255, 0.08)' },
  statusText: { ...typography.caption, fontWeight: '600' },
  statusTextActive: { color: colors.green },
  statusTextArchived: { color: colors.text.secondary },
  calorieRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  calorieValue: { fontSize: 36, fontWeight: '700', color: colors.text.primary },
  calorieUnit: { ...typography.body, color: colors.text.secondary },
  // Chart
  chartSection: { alignItems: 'center', paddingVertical: spacing.lg },
  // Card
  card: { backgroundColor: colors.background.cardSolid, borderRadius: borderRadius.lg, padding: spacing.md },
  cardTitle: { ...typography.body, color: colors.text.primary, fontWeight: '600', marginBottom: spacing.md },
  macroRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: spacing.md },
  macroItem: { alignItems: 'center', gap: 4 },
  macroDot: { width: 8, height: 8, borderRadius: 4 },
  macroLabel: { ...typography.caption, color: colors.text.secondary },
  macroValue: { ...typography.body, color: colors.text.primary, fontWeight: '600' },
  // Meals
  mealItem: { paddingVertical: spacing.sm },
  mealDivider: { borderTopWidth: 1, borderTopColor: colors.background.secondary },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  mealNameRow: { flexDirection: 'row', alignItems: 'center' },
  mealIconBg: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(48, 213, 200, 0.12)', alignItems: 'center', justifyContent: 'center', marginRight: spacing.sm },
  mealName: { ...typography.body, color: colors.text.primary, fontWeight: '600' },
  mealCalories: { ...typography.caption, color: colors.primary },
  foodItem: { ...typography.caption, color: colors.text.secondary, marginLeft: 30, marginVertical: 1 },
  // Header actions
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  saveButton: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.sm, marginRight: spacing.sm },
  saveButtonText: { ...typography.caption, color: '#fff', fontWeight: '600' },
  // Edit inputs
  editInput: { backgroundColor: colors.background.secondary, color: colors.text.primary, borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  editInputSmall: { backgroundColor: colors.background.secondary, color: colors.text.primary, borderRadius: borderRadius.sm, paddingHorizontal: spacing.sm, paddingVertical: 2, minWidth: 50, textAlign: 'center' },
  // Archive
  archiveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.md },
  archiveText: { ...typography.body, color: colors.text.secondary },
});
