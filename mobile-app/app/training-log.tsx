import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles, useColors, typography, spacing, borderRadius } from '../src/theme';
import { ThemeColors } from '../src/theme/colors';
import { getCompletedSessions } from '../src/lib/api';

interface WorkoutSession {
  id: number;
  status: string;
  currentPhase: string | null;
  startedAt: string | null;
  completedAt: string | null;
  totalPausedDuration: number | null;
  liveMetrics: {
    distance?: number;
    duration?: number;
    currentPace?: string;
    avgPace?: string;
    currentHr?: number;
    avgHr?: number;
    calories?: number;
    currentCadence?: number;
  } | null;
  checkpoints: Array<{
    timestamp: string;
    distance: number;
    duration: number;
    heartRate?: number;
    pace?: string;
  }> | null;
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Unknown date';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(dateString: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDuration(startedAt: string | null, completedAt: string | null, pausedDuration: number | null): string {
  if (!startedAt || !completedAt) return '--';
  const start = new Date(startedAt).getTime();
  const end = new Date(completedAt).getTime();
  const totalSeconds = Math.round((end - start) / 1000) - (pausedDuration || 0);
  if (totalSeconds < 0) return '--';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m ${seconds}s`;
}

export default function TrainingLogScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSessions() {
      try {
        const data = await getCompletedSessions();
        setSessions(data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load sessions');
      } finally {
        setLoading(false);
      }
    }
    fetchSessions();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Training Log</Text>
        <View style={styles.backButton} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.text.tertiary} />
          <Text style={styles.emptyText}>{error}</Text>
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="journal-outline" size={48} color={colors.text.tertiary} />
          <Text style={styles.emptyTitle}>No completed sessions yet</Text>
          <Text style={styles.emptyText}>
            Your completed training sessions will appear here.
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {sessions.map((session) => (
            <View key={session.id} style={styles.sessionCard}>
              <View style={styles.sessionHeader}>
                <View style={styles.sessionIcon}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.green} />
                </View>
                <View style={styles.sessionInfo}>
                  <Text style={styles.sessionTitle}>
                    {session.currentPhase || 'Training Session'}
                  </Text>
                  <Text style={styles.sessionDate}>
                    {formatDate(session.completedAt || session.startedAt)}
                    {session.startedAt ? ` at ${formatTime(session.startedAt)}` : ''}
                  </Text>
                </View>
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metric}>
                  <Ionicons name="time-outline" size={14} color={colors.text.secondary} />
                  <Text style={styles.metricValue}>
                    {formatDuration(session.startedAt, session.completedAt, session.totalPausedDuration)}
                  </Text>
                </View>
                {session.liveMetrics?.distance != null && session.liveMetrics.distance > 0 && (
                  <View style={styles.metric}>
                    <Ionicons name="navigate-outline" size={14} color={colors.text.secondary} />
                    <Text style={styles.metricValue}>
                      {(session.liveMetrics.distance / 1000).toFixed(2)} km
                    </Text>
                  </View>
                )}
                {session.liveMetrics?.avgHr != null && session.liveMetrics.avgHr > 0 && (
                  <View style={styles.metric}>
                    <Ionicons name="heart-outline" size={14} color={colors.text.secondary} />
                    <Text style={styles.metricValue}>
                      {session.liveMetrics.avgHr} bpm
                    </Text>
                  </View>
                )}
                {session.checkpoints && session.checkpoints.length > 0 && (
                  <View style={styles.metric}>
                    <Ionicons name="flag-outline" size={14} color={colors.text.secondary} />
                    <Text style={styles.metricValue}>
                      {session.checkpoints.length} checkpoint{session.checkpoints.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text.primary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  sessionCard: {
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sessionIcon: {
    marginRight: spacing.sm,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    ...typography.bodyBold,
    color: colors.text.primary,
  },
  sessionDate: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metricValue: {
    ...typography.caption,
    color: colors.text.secondary,
  },
});
