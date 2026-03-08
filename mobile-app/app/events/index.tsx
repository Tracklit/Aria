import React, { useEffect, useCallback, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../../src/context';
import { useEvents, Event, SubEvent } from '../../src/context/EventsContext';
import { impactLight, impactMedium } from '../../src/utils/haptics';
import { useThemedStyles, useColors, typography, spacing, borderRadius } from '../../src/theme';
import { ThemeColors } from '../../src/theme/colors';

const EVENT_TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  race: 'trophy-outline',
  competition: 'medal-outline',
  meet: 'people-outline',
  time_trial: 'timer-outline',
  tryout: 'clipboard-outline',
  camp: 'bonfire-outline',
  clinic: 'school-outline',
  charity_run: 'heart-outline',
};

const EVENT_TYPE_LABELS: Record<string, string> = {
  race: 'Race',
  competition: 'Competition',
  meet: 'Meet',
  time_trial: 'Time Trial',
  tryout: 'Tryout',
  camp: 'Camp',
  clinic: 'Clinic',
  charity_run: 'Charity Run',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#22C55E',
};

function getCountdownText(dateStr: string): string {
  const now = new Date();
  const eventDate = new Date(dateStr);
  const diffMs = eventDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays < 7) return `in ${diffDays} days`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `in ${weeks} week${weeks > 1 ? 's' : ''}`;
  }
  const months = Math.floor(diffDays / 30);
  return `in ${months} month${months > 1 ? 's' : ''}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatGoalTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs.toFixed(2)}s`;
  return `${mins}:${secs.toFixed(2).padStart(5, '0')}`;
}

function EventCard({ event, index }: { event: Event; index: number }) {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const isPast = new Date(event.date).getTime() < Date.now();

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(400)}>
      <TouchableOpacity
        style={[styles.card, isPast && styles.cardPast]}
        onPress={() => {
          impactLight();
          router.push({ pathname: '/events/create', params: { eventId: event.id.toString() } });
        }}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons
                name={EVENT_TYPE_ICONS[event.eventType] || 'calendar-outline'}
                size={20}
                color={colors.primary}
              />
            </View>
            <View style={styles.cardTitleBlock}>
              <Text style={styles.cardName} numberOfLines={1}>{event.name}</Text>
              <View style={styles.badgeRow}>
                <View style={[styles.typeBadge, { backgroundColor: colors.primary + '18' }]}>
                  <Text style={[styles.typeBadgeText, { color: colors.primary }]}>
                    {EVENT_TYPE_LABELS[event.eventType] || event.eventType}
                  </Text>
                </View>
                <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLORS[event.priority] + '20' }]}>
                  <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[event.priority] || '#888' }]} />
                  <Text style={[styles.priorityText, { color: PRIORITY_COLORS[event.priority] || '#888' }]}>
                    {event.priority.charAt(0).toUpperCase() + event.priority.slice(1)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.countdownContainer}>
            <Text style={[styles.countdownText, isPast && { color: colors.text.tertiary }]}>
              {getCountdownText(event.date)}
            </Text>
          </View>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={14} color={colors.text.secondary} />
            <Text style={styles.detailText}>{formatDate(event.date)}</Text>
          </View>
          {event.location ? (
            <View style={styles.detailRow}>
              <Ionicons name="location-outline" size={14} color={colors.text.secondary} />
              <Text style={styles.detailText} numberOfLines={1}>{event.location}</Text>
            </View>
          ) : null}
          {event.distance ? (
            <View style={styles.detailRow}>
              <Ionicons name="resize-outline" size={14} color={colors.text.secondary} />
              <Text style={styles.detailText}>{event.distance}{event.distanceLabel ? ` ${event.distanceLabel}` : 'm'}</Text>
            </View>
          ) : null}
          {event.goalTime ? (
            <View style={styles.detailRow}>
              <Ionicons name="stopwatch-outline" size={14} color={colors.text.secondary} />
              <Text style={styles.detailText}>Goal: {formatGoalTime(event.goalTime)}</Text>
            </View>
          ) : null}
        </View>

        {/* Sub-Events */}
        {event.subEvents && event.subEvents.length > 0 && (
          <View style={styles.subEventsContainer}>
            <View style={styles.subEventsDivider} />
            <Text style={styles.subEventsLabel}>Sub-Events</Text>
            <View style={styles.subEventsChipRow}>
              {event.subEvents.map((se: SubEvent, idx: number) => (
                <View key={idx} style={styles.subEventChip}>
                  <Text style={styles.subEventChipName}>{se.name}</Text>
                  {se.distanceLabel ? (
                    <Text style={styles.subEventChipDetail}>{se.distanceLabel}</Text>
                  ) : null}
                  {se.goalTime ? (
                    <Text style={styles.subEventChipDetail}>{formatGoalTime(se.goalTime)}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function EventsScreen() {
  const styles = useThemedStyles(createStyles);
  const colors = useColors();
  const { hasValidToken, isLoading: isAuthLoading } = useAuth();
  const { events, isLoading, loadEvents } = useEvents();

  useEffect(() => {
    if (isAuthLoading || !hasValidToken) return;
    loadEvents();
  }, [loadEvents, hasValidToken, isAuthLoading]);

  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [events]);

  const handleRefresh = useCallback(() => {
    if (!hasValidToken) return;
    loadEvents();
  }, [hasValidToken, loadEvents]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => { impactLight(); router.back(); }}>
          <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upcoming Events</Text>
        <View style={{ width: 28 }} />
      </View>

      <FlatList
        data={sortedEvents}
        renderItem={({ item, index }) => <EventCard event={item} index={index} />}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={!isLoading ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={64} color={colors.text.tertiary} />
            <Text style={styles.emptyTitle}>No Events Yet</Text>
            <Text style={styles.emptySubtitle}>
              Add your upcoming races, meets, and competitions to stay on track
            </Text>
          </View>
        ) : null}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          impactMedium();
          router.push('/events/create');
        }}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text.primary,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 120,
  },
  card: {
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardPast: {
    opacity: 0.6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: spacing.sm,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  cardTitleBlock: {
    flex: 1,
  },
  cardName: {
    ...typography.body,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  countdownContainer: {
    alignItems: 'flex-end',
  },
  countdownText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  cardDetails: {
    gap: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    ...typography.h2,
    color: colors.text.primary,
    marginTop: spacing.lg,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.text.secondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  fab: {
    position: 'absolute',
    bottom: 40,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  // Sub-events
  subEventsContainer: {
    marginTop: spacing.sm,
  },
  subEventsDivider: {
    height: 1,
    backgroundColor: colors.background.secondary,
    marginBottom: spacing.sm,
  },
  subEventsLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  subEventsChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  subEventChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary + '12',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  subEventChipName: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.primary,
  },
  subEventChipDetail: {
    fontSize: 11,
    color: colors.text.secondary,
  },
});
