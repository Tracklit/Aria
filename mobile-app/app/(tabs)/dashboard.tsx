import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp, useReducedMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, useDashboard, useWorkout, useSession, useTheme, useHealth, useNutrition } from '../../src/context';
import { impactLight } from '../../src/utils/haptics';
import { getDayLabel, safeParseExercises } from '../../src/utils/formatting';
import { getNextMeal } from '../../src/utils/mealSchedule';
import { getStreakBadge } from '../../src/utils/streakDisplay';
import { useThemedStyles, useColors, spacing, borderRadius } from '../../src/theme';
import { ThemeColors } from '../../src/theme/colors';
import {
  HeroHeader,
  WorkoutHeroCard,
  NextMealCard,
  LatestStatsRow,
  StreakBadge,
  AskAriaSection,
} from '../../src/components/dashboard';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH - 48;
const CARD_GAP = 16;

// Dark mode gradients — vivid and distinguishable
const DARK_GRADIENT_PALETTE: [string, string, string][] = [
  ['#1565C0', '#1976D2', '#0D47A1'], // Vibrant blue
  ['#7B1FA2', '#9C27B0', '#6A1B9A'], // Vivid purple
  ['#2E7D32', '#388E3C', '#1B5E20'], // Rich green
  ['#E65100', '#F57C00', '#BF360C'], // Warm amber/orange
  ['#C62828', '#D32F2F', '#B71C1C'], // Bold red
];

// Light mode gradients — vibrant and saturated (white text must be readable)
const LIGHT_GRADIENT_PALETTE: [string, string, string][] = [
  ['#1976D2', '#2196F3', '#1565C0'], // Vibrant blue
  ['#8E24AA', '#AB47BC', '#7B1FA2'], // Vivid purple
  ['#2E7D32', '#43A047', '#1B5E20'], // Rich green
  ['#EF6C00', '#FB8C00', '#E65100'], // Warm orange
  ['#D32F2F', '#E53935', '#C62828'], // Bold red
];

const DARK_REST_GRADIENT: [string, string, string] = ['#2C2C2E', '#3A3A3C', '#2C2C2E'];
const LIGHT_REST_GRADIENT: [string, string, string] = ['#546E7A', '#607D8B', '#455A64'];

interface WorkoutCardItem {
  id: string;
  kind: 'planned' | 'program' | 'empty';
  badge: string;
  title: string;
  description: string;
  gradient: [string, string, string];
  plannedWorkoutId?: number;
  programId?: number;
  programTitle?: string;
  sessionTitle?: string;
  exercises?: any;
}

function getDisplayName(profileName?: string | null, greeting?: string) {
  if (profileName?.trim()) return profileName.trim();
  if (!greeting) return 'Athlete';
  const match = greeting.match(/,\s*(.+)$/);
  return match?.[1]?.trim() || 'Athlete';
}

export default function DashboardScreen() {
  const reducedMotion = useReducedMotion();
  const { effectiveTheme } = useTheme();
  const colors = useColors();
  const styles = useThemedStyles(createStyles);
  const { profile } = useAuth();
  const { startWorkoutSession, todaysWorkout, todaysWorkouts, todaysProgramSessions, loadTodaysWorkout, loadTodaysWorkouts } = useWorkout();
  const { startSession } = useSession();
  const {
    greeting: _apiGreeting,
    subtitle,
    dynamicSubtitle,
    currentStreak,
    cards,
    insights,
    fatigueScore,
    isLoading,
    loadDashboard,
    loadPatterns,
    loadDynamicSubtitle,
    refreshDashboard,
  } = useDashboard();

  const { healthMetrics, readiness, getReadinessScore, connectedDevices } = useHealth();
  const hasHealthData = connectedDevices.length > 0;
  const { activePlan: activeNutritionPlan } = useNutrition();

  // Always use local time-based greeting instead of API response
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshDashboard(), hasHealthData ? getReadinessScore() : Promise.resolve()]);
    } finally {
      setRefreshing(false);
      impactLight();
    }
  }, [refreshDashboard, getReadinessScore, hasHealthData]);

  useEffect(() => {
    loadDashboard();
    loadPatterns();
    loadTodaysWorkout();
    loadTodaysWorkouts();
    loadDynamicSubtitle();
    if (hasHealthData) {
      getReadinessScore();
    }
  }, [loadDashboard, loadPatterns, loadTodaysWorkout, loadTodaysWorkouts, loadDynamicSubtitle, hasHealthData, getReadinessScore]);

  const displayName = useMemo(
    () => getDisplayName(profile?.displayName, greeting),
    [profile?.displayName, greeting]
  );

  const [activeCardIndex, setActiveCardIndex] = useState(0);

  const nextMeal = useMemo(() => {
    const suggestions = activeNutritionPlan?.mealSuggestions;
    return suggestions ? getNextMeal(suggestions) : null;
  }, [activeNutritionPlan]);

  const streakBadge = useMemo(() => getStreakBadge(currentStreak), [currentStreak]);

  const sleepHours = useMemo<number | null>(() => {
    if (healthMetrics?.sleepDurationSeconds && healthMetrics.sleepDurationSeconds > 0) {
      return healthMetrics.sleepDurationSeconds / 3600;
    }
    return null;
  }, [healthMetrics?.sleepDurationSeconds]);

  const workoutCards: WorkoutCardItem[] = useMemo(() => {
    const GRADIENT_PALETTE = effectiveTheme === 'dark' ? DARK_GRADIENT_PALETTE : LIGHT_GRADIENT_PALETTE;
    const REST_GRADIENT = effectiveTheme === 'dark' ? DARK_REST_GRADIENT : LIGHT_REST_GRADIENT;
    const items: WorkoutCardItem[] = [];
    let gradientIdx = 0;

    todaysWorkouts.forEach((w) => {
      items.push({
        id: `planned-${w.id}`,
        kind: 'planned',
        badge: (w.type || 'WORKOUT').toUpperCase().replace(/_/g, ' '),
        title: w.title || 'Sprint Session',
        description: w.description || w.notes || '',
        gradient: GRADIENT_PALETTE[gradientIdx % GRADIENT_PALETTE.length],
        plannedWorkoutId: w.id,
      });
      gradientIdx++;
    });

    todaysProgramSessions.forEach((s) => {
      items.push({
        id: `program-${s.id}`,
        kind: 'program',
        badge: 'PROGRAM',
        title: s.title || s.programTitle || 'Program Session',
        description: s.description || getDayLabel(s.dayNumber),
        gradient: GRADIENT_PALETTE[gradientIdx % GRADIENT_PALETTE.length],
        programId: s.programId,
        programTitle: s.programTitle,
        sessionTitle: s.title || getDayLabel(s.dayNumber),
        exercises: s.exercises,
      });
      gradientIdx++;
    });

    if (items.length === 0) {
      items.push({
        id: 'empty',
        kind: 'empty',
        badge: 'REST DAY',
        title: 'No Workouts Planned',
        description: 'Enjoy your recovery day',
        gradient: REST_GRADIENT,
      });
    }

    return items;
  }, [todaysWorkouts, todaysProgramSessions, effectiveTheme]);

  const onCarouselScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = e.nativeEvent.contentOffset.x;
    const index = Math.round(offset / (CARD_WIDTH + CARD_GAP));
    setActiveCardIndex(index);
  }, []);

  const handleStartWorkout = useCallback((item: WorkoutCardItem) => {
    impactLight();
    if (item.kind === 'program' && item.programId && item.exercises) {
      startSession(
        item.programId,
        item.programTitle || 'Program',
        item.sessionTitle || 'Session',
        safeParseExercises(item.exercises),
      );
    } else {
      router.push({
        pathname: '/workout/log-workout',
        params: {
          plannedWorkoutId: item.plannedWorkoutId?.toString() ?? '',
          workoutTitle: item.title ?? 'Sprint Session',
        },
      });
    }
  }, [startSession]);

  const displaySubtitle = dynamicSubtitle || subtitle || "Let's get faster today";

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* 1. Hero Header */}
        <Animated.View entering={reducedMotion ? undefined : FadeInDown.duration(400)}>
          <HeroHeader
            greeting={greeting}
            displayName={displayName}
            subtitle={displaySubtitle}
            photoUrl={profile?.photoUrl ?? undefined}
            onSettingsPress={() => router.push('/(tabs)/more')}
          />
        </Animated.View>

        {/* 2. Workout Cards Carousel */}
        <Animated.View entering={reducedMotion ? undefined : FadeInUp.duration(500).delay(50)}>
          <FlatList
            data={workoutCards}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + CARD_GAP}
            decelerationRate="fast"
            contentContainerStyle={styles.carouselContent}
            onScroll={onCarouselScroll}
            scrollEventThrottle={16}
            renderItem={({ item }) => (
              <View style={{ width: CARD_WIDTH, marginRight: CARD_GAP }}>
                <WorkoutHeroCard
                  testID={`dashboard.start_workout.${item.id}`}
                  badge={item.badge}
                  title={item.title}
                  description={item.description}
                  gradient={item.gradient}
                  isEmpty={item.kind === 'empty'}
                  onStart={() => handleStartWorkout(item)}
                />
              </View>
            )}
          />
          {workoutCards.length > 1 && (
            <View style={styles.dotsRow}>
              {workoutCards.map((item, idx) => (
                <View
                  key={item.id}
                  style={[
                    styles.dot,
                    idx === activeCardIndex ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              ))}
            </View>
          )}
        </Animated.View>

        {/* 3. Next Meal */}
        {nextMeal && (
          <Animated.View entering={reducedMotion ? undefined : FadeInUp.duration(400).delay(100)}>
            <NextMealCard
              meal={nextMeal.meal}
              foods={nextMeal.foods}
              calories={nextMeal.calories}
              macros={nextMeal.macros}
              timeWindow={nextMeal.timeWindow}
              onPress={() => router.push('/(tabs)/nutrition')}
            />
          </Animated.View>
        )}

        {/* 4. Latest Stats */}
        <Animated.View entering={reducedMotion ? undefined : FadeInUp.duration(400).delay(150)}>
          <LatestStatsRow
            weeklyMiles={0}
            latestPace={'--:--'}
            sleepHours={sleepHours}
          />
        </Animated.View>

        {/* 5. Streak Badge */}
        {streakBadge && (
          <Animated.View entering={reducedMotion ? undefined : FadeInUp.duration(400).delay(200)}>
            <StreakBadge streak={currentStreak} badge={streakBadge} />
          </Animated.View>
        )}

        {/* Fatigue Warning */}
        {fatigueScore?.riskLevel === 'high' && (
          <Animated.View entering={reducedMotion ? undefined : FadeInUp.duration(400).delay(200)} style={styles.warningCard}>
            <View style={styles.warningHeader}>
              <Ionicons name="warning-outline" size={20} color={colors.red} />
              <Text style={styles.warningTitle}>High Fatigue Detected</Text>
            </View>
            <Text style={styles.warningText}>
              Fatigue Score: {fatigueScore.score}/100 ({fatigueScore.trend})
            </Text>
            {(fatigueScore.factors || []).slice(0, 2).map((factor, index) => (
              <Text key={`${factor}-${index}`} style={styles.factorText}>
                • {factor}
              </Text>
            ))}
            <Text style={styles.warningRecommendation}>
              Recommendation: {fatigueScore.recommendation}
            </Text>
          </Animated.View>
        )}

        {/* 6. Health & Recovery */}
        {hasHealthData && (readiness?.score != null || healthMetrics?.sleepDurationSeconds || healthMetrics?.hrvRmssd || healthMetrics?.restingHeartRate) && (
          <Animated.View entering={reducedMotion ? undefined : FadeInUp.duration(400).delay(250)} style={styles.healthSection}>
            <Text style={styles.sectionTitle}>Health & Recovery</Text>
            <View style={styles.healthCardsRow}>
              {readiness?.score != null && (
                <View style={[styles.healthCard, styles.healthCardWide]}>
                  <View style={styles.healthCardHeader}>
                    <Ionicons name="shield-checkmark" size={16} color={readiness.score >= 80 ? colors.green : readiness.score >= 60 ? colors.yellow : colors.red} />
                    <Text style={styles.healthCardLabel}>Readiness</Text>
                  </View>
                  <Text style={[styles.healthCardValue, { color: readiness.score >= 80 ? colors.green : readiness.score >= 60 ? colors.yellow : colors.red }]}>
                    {readiness.score}
                  </Text>
                  <Text style={styles.healthCardUnit}>/100</Text>
                  <Text style={styles.healthCardCaption}>
                    {readiness.score >= 80 ? 'Ready for high intensity' : readiness.score >= 60 ? 'Moderate training OK' : 'Focus on recovery'}
                  </Text>
                  {readiness.factors && readiness.factors.length > 0 && (
                    <Text style={styles.healthFactors}>
                      {readiness.factors.slice(0, 2).join(' | ')}
                    </Text>
                  )}
                </View>
              )}

              {healthMetrics?.sleepDurationSeconds != null && healthMetrics.sleepDurationSeconds > 0 && (
                <View style={styles.healthCard}>
                  <View style={styles.healthCardHeader}>
                    <Ionicons name="moon" size={16} color={colors.primaryMuted} />
                    <Text style={styles.healthCardLabel}>Sleep</Text>
                  </View>
                  <Text style={styles.healthCardValue}>
                    {Math.floor(healthMetrics.sleepDurationSeconds / 3600)}h {Math.round((healthMetrics.sleepDurationSeconds % 3600) / 60)}m
                  </Text>
                  {healthMetrics.sleepEfficiency != null && (
                    <Text style={styles.healthCardCaption}>
                      {healthMetrics.sleepEfficiency}% efficiency
                    </Text>
                  )}
                  <View style={styles.sleepBar}>
                    {healthMetrics.deepSleepSeconds != null && healthMetrics.sleepDurationSeconds > 0 && (
                      <View style={[styles.sleepSegment, { flex: healthMetrics.deepSleepSeconds / healthMetrics.sleepDurationSeconds, backgroundColor: '#5C6BC0' }]} />
                    )}
                    {healthMetrics.remSleepSeconds != null && healthMetrics.sleepDurationSeconds > 0 && (
                      <View style={[styles.sleepSegment, { flex: healthMetrics.remSleepSeconds / healthMetrics.sleepDurationSeconds, backgroundColor: colors.primaryMuted }]} />
                    )}
                    <View style={[styles.sleepSegment, { flex: 1, backgroundColor: colors.background.secondary }]} />
                  </View>
                  <View style={styles.sleepLegend}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: '#5C6BC0' }]} />
                      <Text style={styles.legendText}>Deep</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: colors.primaryMuted }]} />
                      <Text style={styles.legendText}>REM</Text>
                    </View>
                  </View>
                </View>
              )}

              {(healthMetrics?.hrvRmssd != null || healthMetrics?.restingHeartRate != null) && (
                <View style={styles.healthCard}>
                  <View style={styles.healthCardHeader}>
                    <Ionicons name="pulse" size={16} color={colors.teal} />
                    <Text style={styles.healthCardLabel}>Recovery</Text>
                  </View>
                  {healthMetrics?.hrvRmssd != null && (
                    <View style={styles.recoveryMetric}>
                      <Text style={styles.recoveryLabel}>HRV</Text>
                      <Text style={styles.healthCardValue}>{healthMetrics.hrvRmssd.toFixed(0)}</Text>
                      <Text style={styles.healthCardUnit}>ms</Text>
                    </View>
                  )}
                  {healthMetrics?.restingHeartRate != null && (
                    <View style={styles.recoveryMetric}>
                      <Text style={styles.recoveryLabel}>Resting HR</Text>
                      <Text style={styles.healthCardValue}>{healthMetrics.restingHeartRate}</Text>
                      <Text style={styles.healthCardUnit}>bpm</Text>
                    </View>
                  )}
                  {healthMetrics?.steps != null && healthMetrics.steps > 0 && (
                    <Text style={styles.healthCardCaption}>
                      {healthMetrics.steps.toLocaleString()} steps today
                    </Text>
                  )}
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {/* 7. AI Insights */}
        <Animated.View entering={reducedMotion ? undefined : FadeInUp.duration(400).delay(300)} style={styles.section}>
          <Text style={styles.sectionTitle}>AI Insights</Text>
          {isLoading && insights.length === 0 ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            (insights.slice(0, 3).length > 0
              ? insights.slice(0, 3)
              : [
                  {
                    id: 0,
                    title: 'Form Improvement',
                    message:
                      'Your cadence has improved by 4 BPM over the last two weeks, reducing impact stress on your knees.',
                    suggestedAction: 'View Form Analysis',
                  },
                ]
            ).map((insight, idx) => {
              const insightColors = ['#00E676', '#00E5FF', '#7C4DFF'];
              const insightIcons: Array<keyof typeof Ionicons.glyphMap> = ['bulb-outline', 'trending-up-outline', 'fitness-outline'];
              const accent = insightColors[idx % insightColors.length];
              const icon = insightIcons[idx % insightIcons.length];
              return (
              <Animated.View key={String(insight.id)} entering={reducedMotion ? undefined : FadeInUp.duration(400).delay(350 + idx * 80)}>
              <TouchableOpacity
                testID={`dashboard.insight.${insight.id}`}
                style={[styles.insightCard, { borderLeftColor: accent, backgroundColor: `${accent}14` }]}
                onPress={() => router.push('/(tabs)/chat')}
              >
                <View style={styles.insightHeader}>
                  <Ionicons name={icon} size={18} color={accent} />
                  <Text style={styles.insightTitle}>{insight.title}</Text>
                </View>
                <Text style={styles.insightText}>{insight.message}</Text>
                {insight.suggestedAction ? (
                  <Text style={styles.insightAction}>{insight.suggestedAction}</Text>
                ) : null}
              </TouchableOpacity>
              </Animated.View>
              );
            })
          )}
        </Animated.View>

        {/* 8. Ask Aria */}
        <Animated.View entering={reducedMotion ? undefined : FadeInUp.duration(400).delay(400)}>
          <AskAriaSection />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingBottom: 130,
  },
  carouselContent: {
    paddingHorizontal: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 18,
    borderRadius: 4,
  },
  dotInactive: {
    backgroundColor: colors.text.tertiary,
    opacity: 0.4,
  },
  warningCard: {
    marginHorizontal: 24,
    backgroundColor: 'rgba(255,69,58,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,69,58,0.45)',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  warningHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  warningTitle: {
    marginLeft: 8,
    color: colors.red,
    fontWeight: '700',
    fontSize: 16,
  },
  warningText: {
    color: colors.text.primary,
    fontSize: 14,
    marginBottom: 4,
  },
  factorText: {
    color: colors.text.secondary,
    fontSize: 13,
    marginBottom: 2,
  },
  warningRecommendation: {
    color: colors.text.primary,
    fontSize: 13,
    marginTop: 6,
    fontWeight: '600',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    color: colors.text.primary,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 14,
  },
  loadingState: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  insightCard: {
    backgroundColor: 'rgba(0,230,118,0.08)',
    borderLeftWidth: 3,
    borderLeftColor: '#00E676',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  insightTitle: {
    marginLeft: 8,
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  insightText: {
    color: colors.text.secondary,
    fontSize: 14,
    lineHeight: 20,
  },
  insightAction: {
    color: '#00E676',
    fontWeight: '600',
    marginTop: 6,
    fontSize: 13,
  },
  healthSection: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  healthCardsRow: {
    gap: 12,
  },
  healthCard: {
    backgroundColor: colors.background.cardSolid,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  healthCardWide: {},
  healthCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  healthCardLabel: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '600',
  },
  healthCardValue: {
    color: colors.text.primary,
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 36,
  },
  healthCardUnit: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
    marginTop: -4,
  },
  healthCardCaption: {
    color: colors.text.secondary,
    fontSize: 13,
    marginTop: 4,
  },
  healthFactors: {
    color: colors.text.tertiary,
    fontSize: 11,
    marginTop: 6,
  },
  sleepBar: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 8,
  },
  sleepSegment: {
    height: 6,
  },
  sleepLegend: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    color: colors.text.tertiary,
    fontSize: 11,
  },
  recoveryMetric: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 4,
  },
  recoveryLabel: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '500',
    width: 80,
  },
});
