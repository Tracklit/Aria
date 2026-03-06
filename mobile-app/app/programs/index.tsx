import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePrograms, Program } from '../../src/context/ProgramsContext';
import { ProgramCard } from '../../src/components/features/ProgramCard';
import { ChipGroup } from '../../src/components/features/ChipGroup';
import { impactLight, impactMedium } from '../../src/utils/haptics';
import { useThemedStyles, useColors, typography, spacing, borderRadius } from '../../src/theme';
import { ThemeColors } from '../../src/theme/colors';

const CATEGORIES = ['all', 'sprint', 'endurance', 'strength', 'flexibility'];

export default function ProgramsScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const { programs, isLoading, fetchPrograms, deleteProgram } = usePrograms();
  const [filter, setFilter] = useState<string[]>(['all']);

  useEffect(() => { fetchPrograms(); }, [fetchPrograms]);

  const filtered = filter[0] === 'all' ? programs : programs.filter(p => p.category === filter[0]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Programs</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.filterRow}>
        <ChipGroup options={CATEGORIES} selected={filter} onToggle={(val) => setFilter([val])} />
      </View>

      <FlatList
        data={filtered}
        renderItem={({ item }) => (
          <ProgramCard
            program={item}
            onPress={() => router.push(`/programs/${item.id}` as any)}
            onDelete={() => {
              Alert.alert('Delete Program', 'Are you sure?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: async () => { await deleteProgram(item.id); impactLight(); } },
              ]);
            }}
            onEdit={() => router.push(`/programs/${item.id}/edit` as any)}
          />
        )}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={fetchPrograms} tintColor={colors.primary} />}
        ListEmptyComponent={!isLoading ? (
          <View style={styles.empty}>
            <Ionicons name="barbell-outline" size={64} color={colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No Programs</Text>
            <Text style={styles.emptySubtitle}>Create, upload, or generate a training program</Text>
          </View>
        ) : null}
      />

      <TouchableOpacity style={styles.fab} onPress={() => { impactMedium(); router.push('/programs/add-program'); }}>
        <Ionicons name="add" size={28} color={colors.text.primary} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerTitle: { ...typography.h2, color: colors.text.primary },
  filterRow: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: 120 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { ...typography.h2, color: colors.text.primary, marginTop: spacing.lg },
  emptySubtitle: { ...typography.body, color: colors.text.secondary, textAlign: 'center', marginTop: spacing.sm },
  fab: { position: 'absolute', bottom: 40, right: spacing.lg, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
});
