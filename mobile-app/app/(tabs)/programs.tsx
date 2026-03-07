import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context';
import { usePrograms, Program } from '../../src/context/ProgramsContext';
import { ProgramCard } from '../../src/components/features/ProgramCard';
import { impactLight, impactMedium, notificationSuccess } from '../../src/utils/haptics';
import { useThemedStyles, useColors, typography, spacing, borderRadius } from '../../src/theme';
import { ThemeColors } from '../../src/theme/colors';

type StatusFilter = 'Active' | 'Archived' | 'All';
const STATUS_FILTERS: StatusFilter[] = ['Active', 'Archived', 'All'];

export default function ProgramsTabScreen() {
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const { hasValidToken, isLoading: isAuthLoading } = useAuth();
  const { programs, isLoading, fetchPrograms, deleteProgram, toggleProgramStatus } = usePrograms();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Active');

  useEffect(() => {
    if (isAuthLoading || !hasValidToken) return;
    fetchPrograms();
  }, [fetchPrograms, hasValidToken, isAuthLoading]);

  const filtered = useMemo(() => {
    if (statusFilter === 'All') return programs;
    const statusKey = statusFilter.toLowerCase();
    return programs.filter(p => (p.status || 'active') === statusKey);
  }, [programs, statusFilter]);

  const handleToggleStatus = async (program: Program) => {
    const isArchived = program.status === 'archived';
    const action = isArchived ? 'reactivate' : 'archive';
    Alert.alert(
      `${isArchived ? 'Reactivate' : 'Archive'} Program`,
      `Are you sure you want to ${action} "${program.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isArchived ? 'Reactivate' : 'Archive',
          style: isArchived ? 'default' : 'destructive',
          onPress: async () => {
            try {
              await toggleProgramStatus(program.id);
              notificationSuccess();
            } catch {
              Alert.alert('Error', `Failed to ${action} program`);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Programs</Text>

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterChip, statusFilter === filter && styles.filterChipActive]}
            onPress={() => { setStatusFilter(filter); impactLight(); }}
          >
            <Text style={[styles.filterChipText, statusFilter === filter && styles.filterChipTextActive]}>
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
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
            onToggleStatus={() => handleToggleStatus(item)}
          />
        )}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => {
          if (!hasValidToken) return;
          fetchPrograms().then(() => impactLight());
        }} tintColor={colors.primary} />}
        ListEmptyComponent={!isLoading ? (
          <View style={styles.empty}>
            <Ionicons name="barbell-outline" size={64} color={colors.text.tertiary} />
            <Text style={styles.emptyTitle}>
              {statusFilter === 'Archived' ? 'No Archived Programs' : 'No Programs'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {statusFilter === 'Archived'
                ? 'Swipe left on a program to archive it'
                : 'Create, upload, or generate a training program'}
            </Text>
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
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { ...typography.h2, color: colors.text.primary, marginTop: spacing.lg },
  emptySubtitle: { ...typography.body, color: colors.text.secondary, textAlign: 'center', marginTop: spacing.sm, paddingHorizontal: spacing.xl },
  fab: { position: 'absolute', bottom: 100, right: spacing.lg, width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
});
