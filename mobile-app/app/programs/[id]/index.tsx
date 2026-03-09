import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePrograms, Program } from '../../../src/context/ProgramsContext';
import { useAuth } from '../../../src/context';
import { useSession } from '../../../src/context/SessionContext';
import { getProgram } from '../../../src/lib/api';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemedStyles, useColors, typography, spacing, borderRadius } from '../../../src/theme';
import { ThemeColors } from '../../../src/theme/colors';
import { getDayLabel } from '../../../src/utils/formatting';
import { buildProgramDetailState } from '../../../src/utils/programSessions';
import { impactLight, impactMedium, notificationSuccess } from '../../../src/utils/haptics';
import type { HydratedProgramSession, ProgramDetailStateResult } from '../../../src/utils/programSessions';

/** Return a clean description string, or null if it's just raw JSON / code fences */
function cleanDescription(desc: string | null | undefined): string | null {
  if (!desc) return null;
  let cleaned = desc.replace(/```(?:json)?\s*[\s\S]*?```/g, '').trim();
  if (/^\s*[\[{]/.test(cleaned) && /[\]}]\s*$/.test(cleaned)) return null;
  if (!cleaned || cleaned.length < 5) return null;
  return cleaned;
}

export default function ProgramDetailScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { deleteProgram, toggleProgramStatus, setActiveWeek } = usePrograms();
  const { hasValidToken, isLoading: isAuthLoading } = useAuth();
  const { startSession } = useSession();
  const [program, setProgram] = useState<Program | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [displaySessions, setDisplaySessions] = useState<HydratedProgramSession[]>([]);
  const [totalWeeks, setTotalWeeks] = useState(1);
  const [selectedWeek, setSelectedWeek] = useState(1);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!hasValidToken || !id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    loadProgram();
  }, [hasValidToken, id, isAuthLoading]);

  const loadProgram = async () => {
    try {
      const data = await getProgram(parseInt(id)) as Program;
      setProgram(data);
      const detailState: ProgramDetailStateResult = buildProgramDetailState(data);
      setDisplaySessions(detailState.sessions);
      setTotalWeeks(detailState.weeks);
      const startWeek = data.activeWeek || 1;
      setSelectedWeek(startWeek);
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
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          if (program) { await deleteProgram(program.id); router.back(); }
        }
      },
    ]);
  };

  const handleToggleStatus = async () => {
    if (!program) return;
    const isArchived = program.status === 'archived';
    try {
      await toggleProgramStatus(program.id);
      setProgram(prev => prev ? { ...prev, status: isArchived ? 'active' : 'archived' } : prev);
      notificationSuccess();
    } catch {
      Alert.alert('Error', 'Failed to update program status');
    }
  };

  const handleSetActiveWeek = async (week: number) => {
    if (!program) return;
    try {
      await setActiveWeek(program.id, week);
      setProgram(prev => prev ? { ...prev, activeWeek: week } : prev);
      setSelectedWeek(week);
      impactMedium();
    } catch {
      Alert.alert('Error', 'Failed to set active week');
    }
  };

  const handleAdvanceWeek = (delta: number) => {
    const current = program?.activeWeek || selectedWeek;
    const next = Math.max(1, Math.min(totalWeeks, current + delta));
    if (next !== current) {
      handleSetActiveWeek(next);
    }
  };

  const handleStartSession = () => {
    const sessions = selectedWeekSessions.length > 0 ? selectedWeekSessions : displaySessions;
    if (!program || !sessions || sessions.length === 0) {
      Alert.alert('No Sessions', 'This program has no sessions to start.');
      return;
    }

    const nonRestSessions = sessions.filter((session) => !session.isRestDay && session.exercises.length > 0);
    if (nonRestSessions.length === 0) {
      Alert.alert('No Sessions', 'No training sessions found in this program.');
      return;
    }

    if (nonRestSessions.length === 1) {
      const s = nonRestSessions[0];
      startSession(program.id, program.title, s.title || getDayLabel(s.dayNumber), s.exercises);
      return;
    }

    Alert.alert(
      'Choose Session',
      'Which session do you want to start?',
      [
        ...nonRestSessions.map(s => ({
          text: s.title || getDayLabel(s.dayNumber),
          onPress: () => startSession(program.id, program.title, s.title || getDayLabel(s.dayNumber), s.exercises),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  };

  const weekNumbers = Array.from({ length: totalWeeks }, (_, index) => index + 1);
  const selectedWeekSessions = displaySessions.filter((session) => (
    Math.ceil(session.dayNumber / 7) === selectedWeek
  ));

  const isActive = program?.status === 'active';
  const isArchived = program?.status === 'archived';
  const currentActiveWeek = program?.activeWeek || 1;

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
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TouchableOpacity onPress={handleToggleStatus}>
            <Ionicons
              name={isArchived ? 'refresh-outline' : 'archive-outline'}
              size={22}
              color={isArchived ? colors.primary : colors.text.secondary}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push(`/programs/${id}/edit` as any)}>
            <Ionicons name="create-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete}>
            <Ionicons name="trash-outline" size={22} color={colors.red} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Gradient Header */}
        <LinearGradient
          colors={['#004D40', '#00695C', '#0A0A0A']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientHeader}
        >
          <View style={styles.gradientTopRow}>
            <Text style={styles.gradientTitle}>{program.title}</Text>
            {isActive && (
              <View style={styles.statusBadgeActive}>
                <Ionicons name="checkmark-circle" size={12} color="#32D74B" />
                <Text style={styles.statusBadgeActiveText}>ACTIVE</Text>
              </View>
            )}
            {isArchived && (
              <View style={styles.statusBadgeArchived}>
                <Text style={styles.statusBadgeArchivedText}>ARCHIVED</Text>
              </View>
            )}
          </View>
          <View style={styles.infoRow}>
            {program.category && <View style={styles.badge}><Text style={styles.badgeText}>{program.category}</Text></View>}
            {program.level && <View style={styles.badge}><Text style={styles.badgeText}>{program.level}</Text></View>}
          </View>
          {cleanDescription(program.description) && <Text style={styles.description}>{cleanDescription(program.description)}</Text>}
          <View style={styles.statsRow}>
            {program.duration && <Text style={styles.stat}>{program.duration} weeks</Text>}
            {program.totalSessions && <Text style={styles.stat}>{program.totalSessions} sessions</Text>}
          </View>
        </LinearGradient>

        {/* Active Week Controls */}
        {totalWeeks > 1 && (
          <View style={styles.activeWeekRow}>
            <TouchableOpacity
              style={styles.weekArrow}
              onPress={() => handleAdvanceWeek(-1)}
              disabled={currentActiveWeek <= 1}
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color={currentActiveWeek <= 1 ? colors.text.tertiary : colors.primary}
              />
            </TouchableOpacity>
            <View style={styles.activeWeekCenter}>
              <Text style={styles.activeWeekLabel}>Active Week</Text>
              <Text style={styles.activeWeekNumber}>Week {currentActiveWeek}</Text>
            </View>
            <TouchableOpacity
              style={styles.weekArrow}
              onPress={() => handleAdvanceWeek(1)}
              disabled={currentActiveWeek >= totalWeeks}
            >
              <Ionicons
                name="chevron-forward"
                size={22}
                color={currentActiveWeek >= totalWeeks ? colors.text.tertiary : colors.primary}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Start Session Button */}
        <TouchableOpacity style={styles.startBtn} onPress={() => { impactMedium(); handleStartSession(); }}>
          <Ionicons name="play-circle" size={22} color="#fff" />
          <Text style={styles.startBtnText}>Start Session</Text>
        </TouchableOpacity>

        {totalWeeks > 1 && (
          <View style={styles.weekSection}>
            <Text style={styles.sectionTitle}>Weeks</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weekScroll}>
              {weekNumbers.map((week) => {
                const sessionsForWeek = displaySessions.filter((session) => Math.ceil(session.dayNumber / 7) === week);
                const workoutCount = sessionsForWeek.filter((session) => !session.isRestDay && session.exercises.length > 0).length;
                const isSelected = selectedWeek === week;
                const isActiveWeek = currentActiveWeek === week;

                return (
                  <TouchableOpacity
                    key={week}
                    style={[
                      styles.weekCard,
                      isSelected && styles.weekCardSelected,
                      isActiveWeek && !isSelected && styles.weekCardActiveWeek,
                    ]}
                    onPress={() => { setSelectedWeek(week); impactLight(); }}
                  >
                    <View style={styles.weekCardHeader}>
                      <Text style={[styles.weekCardTitle, isSelected && styles.weekCardTitleSelected]}>Week {week}</Text>
                      {isActiveWeek && (
                        <View style={styles.activeWeekDot} />
                      )}
                    </View>
                    <Text style={[styles.weekCardMeta, isSelected && styles.weekCardMetaSelected]}>
                      {workoutCount} workout{workoutCount === 1 ? '' : 's'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Sessions */}
        {(() => {
          const sessions = totalWeeks > 1 ? selectedWeekSessions : displaySessions;
          if (!sessions || sessions.length === 0) return null;
          return (
            <View style={styles.sessionsSection}>
              <Text style={styles.sectionTitle}>
                {totalWeeks > 1 ? `Week ${selectedWeek}` : 'Sessions'}
              </Text>
              {sessions.map((session, idx) => {
                const key = 'id' in session ? (session as any).id : idx;
                const dayNum = session.dayNumber;
                return (
                  <View key={key} style={styles.sessionCard}>
                    <TouchableOpacity style={styles.sessionHeader} onPress={() => toggleDay(dayNum)}>
                      <View style={styles.sessionLeft}>
                        <View style={[styles.dayBadge, session.isRestDay ? styles.dayBadgeRest : styles.dayBadgeTraining]}>
                          <Text style={[styles.dayBadgeText, session.isRestDay ? styles.dayBadgeTextRest : styles.dayBadgeTextTraining]}>{getDayLabel(dayNum)}</Text>
                        </View>
                        <Text style={styles.sessionTitle}>{session.title || (session.isRestDay ? 'Rest Day' : 'Training')}</Text>
                      </View>
                      <Ionicons name={expandedDays.has(dayNum) ? 'chevron-up' : 'chevron-down'} size={20} color={colors.text.tertiary} />
                    </TouchableOpacity>
                    {expandedDays.has(dayNum) && (
                      <View style={styles.sessionBody}>
                        {session.description && <Text style={styles.sessionDesc}>{session.description}</Text>}
                        {session.exercises.map((ex, i) => (
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
                );
              })}
            </View>
          );
        })()}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.primary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  headerTitle: { ...typography.body, color: colors.text.primary, fontWeight: '600', flex: 1, textAlign: 'center', marginHorizontal: spacing.md },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { ...typography.body, color: colors.text.secondary },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 40, gap: spacing.md },
  gradientHeader: { borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.xs },
  gradientTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  gradientTitle: { ...typography.h2, color: '#FFFFFF', flex: 1, marginRight: spacing.sm },
  statusBadgeActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(50, 215, 75, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  statusBadgeActiveText: { fontSize: 10, fontWeight: '700', color: '#32D74B', letterSpacing: 0.5 },
  statusBadgeArchived: {
    backgroundColor: 'rgba(142, 142, 147, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  statusBadgeArchivedText: { fontSize: 10, fontWeight: '700', color: '#8E8E93', letterSpacing: 0.5 },
  infoRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm },
  badge: { backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm },
  badgeText: { ...typography.caption, color: '#FFFFFF', textTransform: 'capitalize' },
  description: { ...typography.body, color: 'rgba(255,255,255,0.75)', marginBottom: spacing.sm },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  stat: { ...typography.caption, color: 'rgba(255,255,255,0.6)' },
  activeWeekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  weekArrow: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeWeekCenter: {
    flex: 1,
    alignItems: 'center',
  },
  activeWeekLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontWeight: '500',
  },
  activeWeekNumber: {
    ...typography.bodyBold,
    color: colors.primary,
    fontSize: 18,
  },
  weekSection: { gap: spacing.sm },
  weekScroll: { gap: spacing.sm, paddingRight: spacing.md },
  weekCard: {
    minWidth: 110,
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.text.tertiary + '20',
    gap: 2,
  },
  weekCardSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  weekCardActiveWeek: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  weekCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  weekCardTitle: { ...typography.body, color: colors.text.primary, fontWeight: '600' },
  weekCardTitleSelected: { color: '#fff' },
  weekCardMeta: { ...typography.caption, color: colors.text.tertiary },
  weekCardMetaSelected: { color: 'rgba(255,255,255,0.82)' },
  activeWeekDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#32D74B',
  },
  sessionsSection: { gap: spacing.sm },
  sectionTitle: { ...typography.body, color: colors.text.primary, fontWeight: '600' },
  sessionCard: { backgroundColor: colors.background.cardSolid, borderRadius: borderRadius.lg, overflow: 'hidden' },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
  sessionLeft: { flex: 1 },
  dayBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm, marginBottom: 2, alignSelf: 'flex-start' },
  dayBadgeTraining: { backgroundColor: 'rgba(48, 213, 200, 0.15)' },
  dayBadgeRest: { backgroundColor: 'rgba(142, 142, 147, 0.15)' },
  dayBadgeText: { ...typography.caption, fontWeight: '600' },
  dayBadgeTextTraining: { color: colors.primary },
  dayBadgeTextRest: { color: colors.text.secondary },
  sessionTitle: { ...typography.body, color: colors.text.primary },
  sessionBody: { padding: spacing.md, paddingTop: 0, borderTopWidth: 1, borderTopColor: colors.background.secondary },
  sessionDesc: { ...typography.caption, color: colors.text.secondary, marginBottom: spacing.sm },
  exerciseRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  exerciseName: { ...typography.body, color: colors.text.primary },
  exerciseDetail: { ...typography.caption, color: colors.text.tertiary },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  startBtnText: { ...typography.bodyBold, color: '#fff' },
});
