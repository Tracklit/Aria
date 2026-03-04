import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNutrition, NutritionPlan } from '../../src/context/NutritionContext';
import { NutritionPlanCard } from '../../src/components/features/NutritionPlanCard';
import { colors, typography, spacing, borderRadius } from '../../src/theme';

type FilterOption = 'All' | 'Active' | 'Archived';
const FILTERS: FilterOption[] = ['All', 'Active', 'Archived'];

export default function NutritionScreen() {
  const { plans, isLoading, fetchPlans } = useNutrition();
  const [activeFilter, setActiveFilter] = useState<FilterOption>('All');

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const onRefresh = useCallback(() => {
    fetchPlans();
  }, [fetchPlans]);

  const filteredPlans = useMemo(() => {
    if (activeFilter === 'All') return plans;
    return plans.filter(p => p.status === activeFilter.toLowerCase());
  }, [plans, activeFilter]);

  const renderItem = ({ item }: { item: NutritionPlan }) => (
    <NutritionPlanCard
      plan={item}
      onPress={() => router.push(`/nutrition/${item.id}`)}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="restaurant-outline" size={64} color={colors.text.tertiary} />
      <Text style={styles.emptyTitle}>No Nutrition Plans</Text>
      <Text style={styles.emptySubtitle}>Generate an AI-powered nutrition plan tailored to your training</Text>
      <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/nutrition/create')}>
        <Text style={styles.emptyButtonText}>Generate a Plan</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Nutrition</Text>
      <View style={styles.filterRow}>
        {FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
            onPress={() => setActiveFilter(filter)}
          >
            <Text style={[styles.filterChipText, activeFilter === filter && styles.filterChipTextActive]}>
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={filteredPlans}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={!isLoading ? renderEmpty : null}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={colors.primary} />}
      />
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/nutrition/create')}>
        <Ionicons name="add" size={28} color={colors.text.primary} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  title: { ...typography.h1, color: colors.text.primary, paddingHorizontal: spacing.lg, marginTop: spacing.md, marginBottom: spacing.md },
  filterRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, marginBottom: spacing.md, gap: spacing.sm },
  filterChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.cardSolid,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: colors.text.primary,
  },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: 120 },
  emptyContainer: { alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing.xl },
  emptyTitle: { ...typography.h2, color: colors.text.primary, marginTop: spacing.lg },
  emptySubtitle: { ...typography.body, color: colors.text.secondary, textAlign: 'center', marginTop: spacing.sm },
  emptyButton: { backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.lg, marginTop: spacing.lg },
  emptyButtonText: { ...typography.body, color: colors.text.primary, fontWeight: '600' },
  fab: { position: 'absolute', bottom: 100, right: spacing.lg, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
});
