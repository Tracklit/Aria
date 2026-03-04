import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePrograms, Program } from '../../src/context/ProgramsContext';
import { getProgram } from '../../src/lib/api';
import { colors, typography, spacing, borderRadius } from '../../src/theme';

export default function ProgramDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { deleteProgram } = usePrograms();
  const [program, setProgram] = useState<Program | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProgram();
  }, [id]);

  const loadProgram = async () => {
    try {
      const data = await getProgram(parseInt(id));
      setProgram(data as Program);
    } catch (error) {
      console.error('Failed to load program:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDay = (day: number) => {
    setExpandedDays(prev => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const handleDelete = () => {
    Alert.alert('Delete Program', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        if (program) { await deleteProgram(program.id); router.back(); }
      }},
    ]);
  };

  if (isLoading || !program) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.loading}><Text style={styles.loadingText}>Loading...</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{program.title}</Text>
        <TouchableOpacity onPress={handleDelete}>
          <Ionicons name="trash-outline" size={22} color={colors.red} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Program Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            {program.category && <View style={styles.badge}><Text style={styles.badgeText}>{program.category}</Text></View>}
            {program.level && <View style={styles.badge}><Text style={styles.badgeText}>{program.level}</Text></View>}
          </View>
          {program.description && <Text style={styles.description}>{program.description}</Text>}
          <View style={styles.statsRow}>
            {program.duration && <Text style={styles.stat}>{program.duration} weeks</Text>}
            {program.totalSessions && <Text style={styles.stat}>{program.totalSessions} sessions</Text>}
          </View>
        </View>

        {/* Sessions */}
        {program.sessions && program.sessions.length > 0 && (
          <View style={styles.sessionsSection}>
            <Text style={styles.sectionTitle}>Sessions</Text>
            {program.sessions.map((session) => (
              <View key={session.id} style={styles.sessionCard}>
                <TouchableOpacity style={styles.sessionHeader} onPress={() => toggleDay(session.dayNumber)}>
                  <View style={styles.sessionLeft}>
                    <Text style={styles.dayNumber}>Day {session.dayNumber}</Text>
                    <Text style={styles.sessionTitle}>{session.title || (session.isRestDay ? 'Rest Day' : 'Training')}</Text>
                  </View>
                  <Ionicons name={expandedDays.has(session.dayNumber) ? 'chevron-up' : 'chevron-down'} size={20} color={colors.text.tertiary} />
                </TouchableOpacity>
                {expandedDays.has(session.dayNumber) && (
                  <View style={styles.sessionBody}>
                    {session.description && <Text style={styles.sessionDesc}>{session.description}</Text>}
                    {session.exercises && session.exercises.map((ex, i) => (
                      <View key={i} style={styles.exerciseRow}>
                        <Text style={styles.exerciseName}>{ex.name}</Text>
                        <Text style={styles.exerciseDetail}>
                          {ex.sets && ex.reps ? `${ex.sets}x${ex.reps}` : ''}
                          {ex.rest ? ` (${ex.rest}s rest)` : ''}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerTitle: { ...typography.body, color: colors.text.primary, fontWeight: '600', flex: 1, textAlign: 'center', marginHorizontal: spacing.md },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { ...typography.body, color: colors.text.secondary },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 40, gap: spacing.md },
  infoCard: { backgroundColor: colors.background.cardSolid, borderRadius: borderRadius.lg, padding: spacing.md },
  infoRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm },
  badge: { backgroundColor: colors.background.secondary, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm },
  badgeText: { ...typography.caption, color: colors.text.secondary, textTransform: 'capitalize' },
  description: { ...typography.body, color: colors.text.secondary, marginBottom: spacing.sm },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  stat: { ...typography.caption, color: colors.text.tertiary },
  sessionsSection: { gap: spacing.sm },
  sectionTitle: { ...typography.body, color: colors.text.primary, fontWeight: '600' },
  sessionCard: { backgroundColor: colors.background.cardSolid, borderRadius: borderRadius.lg, overflow: 'hidden' },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
  sessionLeft: { flex: 1 },
  dayNumber: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  sessionTitle: { ...typography.body, color: colors.text.primary },
  sessionBody: { padding: spacing.md, paddingTop: 0, borderTopWidth: 1, borderTopColor: colors.background.secondary },
  sessionDesc: { ...typography.caption, color: colors.text.secondary, marginBottom: spacing.sm },
  exerciseRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  exerciseName: { ...typography.body, color: colors.text.primary },
  exerciseDetail: { ...typography.caption, color: colors.text.tertiary },
});
