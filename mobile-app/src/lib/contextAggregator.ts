/**
 * Context Aggregation Service
 *
 * Aggregates user data from multiple sources to provide comprehensive context
 * for AI-powered dashboard insights and recommendations.
 *
 * This service pulls data from:
 * - User profile and preferences
 * - Recent workouts and performance data
 * - Upcoming races and competitions
 * - Weekly statistics and trends
 * - Chat history for conversation context
 * - Current streaks and achievements
 * - Training load and fatigue indicators
 */

import {
  getCurrentUser,
  getWorkouts,
  getRaces,
  getWeeklyAnalytics,
  getConversationMessages,
} from './api';
import { cache, CacheTTL } from './cache';
import type {
  UserProfile,
  Workout,
  Race,
  WeeklyStats,
  ChatMessage,
} from '../types/api';

/**
 * Aggregated user context for AI insight generation
 */
export interface AggregatedContext {
  /** User profile with sport, level, goals, injury status */
  profile: UserProfile;

  /** Recent workouts (last 10) with performance data */
  recentWorkouts: Workout[];

  /** Upcoming races in next 90 days */
  upcomingRaces: Race[];

  /** Weekly statistics (distance, duration, count, pace) */
  weeklyStats: WeeklyStats;

  /** Recent chat messages (last 10) for conversation context */
  chatHistory: ChatMessage[];

  /** Current workout streak (consecutive days) */
  currentStreak: number;

  /** Training load score (calculated from recent workouts) */
  trainingLoad: number;

  /** Timestamp when context was aggregated */
  aggregatedAt: Date;
}

/**
 * Calculate training load from recent workouts
 *
 * Uses a simplified TRIMP (Training Impulse) calculation:
 * - Duration * Intensity Factor
 * - Intensity based on workout type
 * - Summed over last 7 days
 *
 * @param workouts Recent workouts (last 7-10 days)
 * @returns Training load score (0-1000+)
 */
function calculateTrainingLoad(workouts: Workout[]): number {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // Filter to last 7 days
  const recentWorkouts = workouts.filter((w) =>
    w.completedDate && new Date(w.completedDate) >= sevenDaysAgo
  );

  // Calculate load for each workout
  const totalLoad = recentWorkouts.reduce((sum, workout) => {
    if (!workout.duration) return sum;

    // Intensity factors by workout type (0.5 - 1.5)
    const intensityFactors: Record<string, number> = {
      'easy_run': 0.6,
      'long_run': 0.7,
      'tempo_run': 1.2,
      'interval_training': 1.5,
      'recovery_run': 0.5,
      'race': 1.5,
      'speed_work': 1.4,
      'hill_training': 1.3,
      'fartlek': 1.1,
    };

    const intensity = intensityFactors[workout.type] || 0.8;
    const durationMinutes = workout.duration / 60;

    // TRIMP = duration * intensity
    return sum + (durationMinutes * intensity);
  }, 0);

  return Math.round(totalLoad);
}

/**
 * Calculate current workout streak
 *
 * Counts consecutive days with completed workouts.
 * Breaks if more than 1 day gap between workouts.
 *
 * @param workouts All completed workouts (sorted by date desc)
 * @returns Current streak count (days)
 */
function calculateStreak(workouts: Workout[]): number {
  if (!workouts || workouts.length === 0) return 0;

  // Get completed workouts sorted by date (most recent first)
  const completed = workouts
    .filter((w) => w.completedDate && w.status === 'completed')
    .sort((a, b) =>
      new Date(b.completedDate!).getTime() - new Date(a.completedDate!).getTime()
    );

  if (completed.length === 0) return 0;

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0); // Start of today

  for (const workout of completed) {
    const workoutDate = new Date(workout.completedDate!);
    workoutDate.setHours(0, 0, 0, 0);

    const daysDiff = Math.floor(
      (currentDate.getTime() - workoutDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Allow today or yesterday
    if (daysDiff === 0 || daysDiff === 1) {
      streak++;
      currentDate = workoutDate;
    } else if (daysDiff > 1) {
      // Gap detected, streak broken
      break;
    }
  }

  return streak;
}

/**
 * Aggregate user context from multiple data sources
 *
 * Fetches data in parallel for performance, then combines
 * into a single context object for AI insight generation.
 *
 * Uses caching to avoid redundant API calls. Cache is valid for 5 minutes.
 *
 * @param conversationId Optional conversation ID for chat history
 * @param forceRefresh Force refresh and bypass cache
 * @returns Aggregated context with all user data
 * @throws Error if critical data cannot be fetched
 */
export async function aggregateUserContext(
  conversationId?: number,
  forceRefresh = false
): Promise<AggregatedContext> {
  const CACHE_KEY = `context:aggregated:${conversationId || 'default'}`;

  // Try cache first (unless forcing refresh)
  if (!forceRefresh) {
    const cached = cache.get<AggregatedContext>(CACHE_KEY);
    if (cached) {
      console.log('[ContextAggregator] Using cached context');
      return cached;
    }
  }

  try {
    // Fetch all data sources in parallel
    const [user, workouts, races, weeklyStats, chatMessages] = await Promise.all([
      getCurrentUser(),
      getWorkouts({ limit: 20 }).catch(() => []), // Fetch more for streak calculation
      getRaces().catch(() => []),
      getWeeklyAnalytics().catch(() => null),
      conversationId
        ? getConversationMessages(conversationId).then((msgs) => msgs.slice(-10))
        : Promise.resolve([]),
    ]);

    // Filter upcoming races (next 90 days)
    const now = new Date();
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

    const upcomingRaces = races.filter((race) => {
      const raceDate = new Date(race.date);
      return raceDate >= now && raceDate <= ninetyDaysFromNow;
    });

    // Get recent workouts (last 10) for AI analysis
    const recentWorkouts = workouts.slice(0, 10);

    // Calculate training load and streak
    const trainingLoad = calculateTrainingLoad(workouts);
    const currentStreak = calculateStreak(workouts);

    const context: AggregatedContext = {
      profile: user.profile,
      recentWorkouts,
      upcomingRaces,
      weeklyStats: weeklyStats || {
        totalDistance: 0,
        totalDuration: 0,
        workoutCount: 0,
        avgPace: '0:00',
      },
      chatHistory: chatMessages,
      currentStreak,
      trainingLoad,
      aggregatedAt: new Date(),
    };

    // Cache for 5 minutes
    cache.set(CACHE_KEY, context, CacheTTL.MEDIUM);

    return context;
  } catch (error) {
    console.error('[ContextAggregator] Failed to aggregate context:', error);
    throw new Error('Failed to load user context for insights');
  }
}

/**
 * Get a summary of the aggregated context for logging/debugging
 */
export function getContextSummary(context: AggregatedContext): string {
  return `Context Summary (${context.aggregatedAt.toISOString()}):
  - Profile: ${context.profile.sport || 'Unknown'} athlete
  - Recent Workouts: ${context.recentWorkouts.length}
  - Upcoming Races: ${context.upcomingRaces.length}
  - Weekly Distance: ${(context.weeklyStats.totalDistance / 1000).toFixed(1)}km
  - Current Streak: ${context.currentStreak} days
  - Training Load: ${context.trainingLoad}
  - Chat History: ${context.chatHistory.length} messages`;
}
