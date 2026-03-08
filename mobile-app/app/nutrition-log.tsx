import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles, useColors, typography, spacing, borderRadius } from '../src/theme';
import { ThemeColors } from '../src/theme/colors';
import { getNutritionLogs, NutritionLogEntry } from '../src/lib/api';

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

function groupByDate(logs: NutritionLogEntry[]): Record<string, NutritionLogEntry[]> {
  const groups: Record<string, NutritionLogEntry[]> = {};
  for (const log of logs) {
    const dateKey = new Date(log.date).toDateString();
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(log);
  }
  return groups;
}

export default function NutritionLogScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const [logs, setLogs] = useState<NutritionLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function fetchLogs() {
        try {
          setLoading(true);
          const data = await getNutritionLogs();
          if (!cancelled) setLogs(data || []);
        } catch (err: any) {
          if (!cancelled) setError(err.message || 'Failed to load nutrition logs');
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
      fetchLogs();
      return () => { cancelled = true; };
    }, [])
  );

  const grouped = groupByDate(logs);
  const dateKeys = Object.keys(grouped).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Nutrition Log</Text>
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
      ) : logs.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="restaurant-outline" size={48} color={colors.text.tertiary} />
          <Text style={styles.emptyTitle}>No nutrition logs yet</Text>
          <Text style={styles.emptyText}>
            Complete or skip meals from the dashboard to start logging.
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {dateKeys.map((dateKey) => (
            <View key={dateKey} style={styles.dateGroup}>
              <Text style={styles.dateHeader}>{formatDate(dateKey)}</Text>
              {grouped[dateKey].map((log) => (
                <View key={log.id} style={styles.logCard}>
                  <View style={styles.logRow}>
                    <View style={[
                      styles.statusIcon,
                      { backgroundColor: log.status === 'completed' ? 'rgba(76,175,80,0.15)' : 'rgba(255,69,58,0.12)' },
                    ]}>
                      <Ionicons
                        name={log.status === 'completed' ? 'checkmark-circle' : 'close-circle'}
                        size={20}
                        color={log.status === 'completed' ? '#4CAF50' : '#FF453A'}
                      />
                    </View>
                    <View style={styles.logInfo}>
                      <Text style={[
                        styles.mealName,
                        { color: colors.text.primary },
                        log.status === 'skipped' && styles.mealSkipped,
                      ]}>
                        {log.mealName}
                      </Text>
                      <Text style={[styles.logTime, { color: colors.text.tertiary }]}>
                        {formatTime(log.date)} - {log.status === 'completed' ? 'Completed' : 'Skipped'}
                      </Text>
                    </View>
                    {log.calories != null && log.calories > 0 && (
                      <View style={styles.caloriesWrap}>
                        <Text style={[styles.caloriesValue, { color: colors.text.primary }]}>{log.calories}</Text>
                        <Text style={[styles.caloriesUnit, { color: colors.text.tertiary }]}>cal</Text>
                      </View>
                    )}
                  </View>
                  {log.notes ? (
                    <Text style={[styles.notes, { color: colors.text.secondary }]}>{log.notes}</Text>
                  ) : null}
                </View>
              ))}
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.h2,
    color: colors.text.primary,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  dateGroup: {
    marginTop: spacing.lg,
  },
  dateHeader: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  logCard: {
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  logInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 15,
    fontWeight: '600',
  },
  mealSkipped: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  logTime: {
    fontSize: 12,
    marginTop: 2,
  },
  caloriesWrap: {
    alignItems: 'flex-end',
  },
  caloriesValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  caloriesUnit: {
    fontSize: 11,
  },
  notes: {
    fontSize: 13,
    marginTop: spacing.sm,
    paddingLeft: 48,
    lineHeight: 18,
  },
});
