import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usePrograms, Program } from '../../../src/context/ProgramsContext';
import { useSession } from '../../../src/context/SessionContext';
import { getProgram } from '../../../src/lib/api';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemedStyles, useColors, typography, spacing, borderRadius } from '../../../src/theme';
import { ThemeColors } from '../../../src/theme/colors';

interface ParsedSession {
  dayNumber: number;
  title: string;
  description?: string;
  isRestDay: boolean;
  exercises: Array<{ name: string; sets?: number; reps?: number | string; rest?: number }>;
}

function parseAIContent(content: string | null | undefined): ParsedSession[] {
  if (!content) return [];
  try {
    const clean = content.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(clean);
    if (Array.isArray(parsed)) return parsed;
    if (parsed.sessions && Array.isArray(parsed.sessions)) return parsed.sessions;
    return [];
  } catch {
    return [];
  }
}

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
  const { deleteProgram } = usePrograms();
  const { startSession } = useSession();
  const [program, setProgram] = useState<Program | null>(null);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [parsedSessions, setParsedSessions] = useState<ParsedSession[]>([]);

  useEffect(() => {
    loadProgram();
  }, [id]);

  const loadProgram = async () => {
    try {
      const data = await getProgram(parseInt(id)) as Program;
      setProgram(data);

      if (!data.sessions || data.sessions.length === 0) {
        const fromText = parseAIContent(data.textContent);
        if (fromText.length > 0) {
          setParsedSessions(fromText);
        } else {
          const fromDesc = parseAIContent(data.description);
          if (fromDesc.length > 0) {
            setParsedSessions(fromDesc);
          }
        }
      }
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

  const handleStartSession = () => {
    const sessions = (program?.sessions && program.sessions.length > 0) ? program.sessions : parsedSessions;
    if (!program || !sessions || sessions.length === 0) {
      Alert.alert('No Sessions', 'This program has no sessions to start.');
      return;
    }

    const nonRestSessions = sessions.filter(s => !s.isRestDay && s.exercises && s.exercises.length > 0);
    if (nonRestSessions.length === 0) {
      Alert.alert('No Sessions', 'No training sessions found in this program.');
      return;
    }

    if (nonRestSessions.length === 1) {
      const s = nonRestSessions[0];
      startSession(program.id, program.title, s.title || `Day ${s.dayNumber}`, s.exercises);
      return;
    }

    Alert.alert(
      'Choose Session',
      'Which session do you want to start?',
      [
        ...nonRestSessions.map(s => ({
          text: s.title || `Day ${s.dayNumber}`,
          onPress: () => startSession(program.id, program.title, s.title || `Day ${s.dayNumber}`, s.exercises),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
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
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
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
          <Text style={styles.gradientTitle}>{program.title}</Text>
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

        {/* Start Session Button */}
        <TouchableOpacity style={styles.startBtn} onPress={handleStartSession}>
          <Ionicons name="play-circle" size={22} color="#fff" />
          <Text style={styles.startBtnText}>Start Session</Text>
        </TouchableOpacity>

        {/* Sessions */}
        {(() => {
          const sessions = (program.sessions && program.sessions.length > 0) ? program.sessions : parsedSessions;
          if (!sessions || sessions.length === 0) return null;
          return (
            <View style={styles.sessionsSection}>
              <Text style={styles.sectionTitle}>Sessions</Text>
              {sessions.map((session, idx) => {
                const key = 'id' in session ? (session as any).id : idx;
                const dayNum = session.dayNumber;
                return (
                  <View key={key} style={styles.sessionCard}>
                    <TouchableOpacity style={styles.sessionHeader} onPress={() => toggleDay(dayNum)}>
                      <View style={styles.sessionLeft}>
                        <View style={[styles.dayBadge, session.isRestDay ? styles.dayBadgeRest : styles.dayBadgeTraining]}>
                          <Text style={[styles.dayBadgeText, session.isRestDay ? styles.dayBadgeTextRest : styles.dayBadgeTextTraining]}>Day {dayNum}</Text>
                        </View>
                        <Text style={styles.sessionTitle}>{session.title || (session.isRestDay ? 'Rest Day' : 'Training')}</Text>
                      </View>
                      <Ionicons name={expandedDays.has(dayNum) ? 'chevron-up' : 'chevron-down'} size={20} color={colors.text.tertiary} />
                    </TouchableOpacity>
                    {expandedDays.has(dayNum) && (
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
  gradientTitle: { ...typography.h2, color: colors.text.primary, marginBottom: spacing.sm },
  infoRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm },
  badge: { backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm },
  badgeText: { ...typography.caption, color: colors.text.primary, textTransform: 'capitalize' },
  description: { ...typography.body, color: 'rgba(255,255,255,0.75)', marginBottom: spacing.sm },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  stat: { ...typography.caption, color: 'rgba(255,255,255,0.6)' },
  sessionsSection: { gap: spacing.sm },
  sectionTitle: { ...typography.body, color: colors.text.primary, fontWeight: '600' },
  sessionCard: { backgroundColor: colors.background.cardSolid, borderRadius: borderRadius.lg, overflow: 'hidden' },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md },
  sessionLeft: { flex: 1 },
  dayBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm, marginBottom: 2, alignSelf: 'flex-start' },
  dayBadgeTraining: { backgroundColor: 'rgba(48, 213, 200, 0.15)' },
  dayBadgeRest: { backgroundColor: 'rgba(142, 142, 147, 0.15)' },
  dayBadgeText: { ...typography.caption, fontWeight: '600' },
  dayBadgeTextTraining: { color: colors.teal },
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
    backgroundColor: colors.teal,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
  },
  startBtnText: { ...typography.bodyBold, color: '#fff' },
});
