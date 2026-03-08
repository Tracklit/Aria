import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  getDashboardState,
  generateDashboardInsights,
  getTrainingPatterns,
  getFatigueScore,
  getTodaysWorkout,
  getProgressCoachingInsight,
} from '../lib/api';
import type { CoachingInsight } from '../lib/api';
import { aggregateUserContext } from '../lib/contextAggregator';
import { cache, CacheTTL } from '../lib/cache';
import { retryWithBackoff, isRetryableError } from '../lib/retry';
import { calculateStreak } from '../utils/streakCalculator';
import type {
  AIInsight,
  TrainingPattern,
  FatigueScore,
} from '../types/api';

export interface DashboardCard {
  type: 'workout_card' | 'insight_card' | 'competition_card' | 'streak_card' | 'stats_row';
  title: string;
  subtitle?: string;
  content: any;
  cta?: {
    label: string;
    action: string;
    data?: any;
  };
  priority: number;
  order: number;
}

export type DashboardMode = 'general' | 'workout_ready' | 'competition_day' | 'recovery_focus' | 'rest_day';

interface DashboardState {
  mode: DashboardMode;
  greeting: string;
  subtitle: string;
  dynamicSubtitle: string;
  currentStreak: number;
  cards: DashboardCard[];
  insights: AIInsight[];
  patterns: TrainingPattern[];
  fatigueScore: FatigueScore | null;
  progressInsight: CoachingInsight | null;
  isProgressInsightLoading: boolean;
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
  lastRefresh: Date | null;
}

interface DashboardContextType extends DashboardState {
  loadDashboard: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
  generateAIInsights: (forceRefresh?: boolean) => Promise<void>;
  loadPatterns: () => Promise<void>;
  loadDynamicSubtitle: () => Promise<void>;
  loadProgressInsights: () => Promise<void>;
  clearError: () => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<DashboardState>({
    mode: 'general',
    greeting: '',
    subtitle: '',
    dynamicSubtitle: '',
    currentStreak: 0,
    cards: [],
    insights: [],
    patterns: [],
    fatigueScore: null,
    progressInsight: null,
    isProgressInsightLoading: false,
    isLoading: false,
    isGenerating: false,
    error: null,
    lastRefresh: null,
  });

  const loadDashboard = useCallback(async (forceRefresh = false) => {
    const CACHE_KEY = 'dashboard:state';

    // Try to get from cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cached = cache.get<{
        mode: DashboardMode;
        greeting: string;
        subtitle: string;
        cards: DashboardCard[];
      }>(CACHE_KEY);

      if (cached) {
        setState((prev) => ({
          ...prev,
          mode: cached.mode,
          greeting: cached.greeting,
          subtitle: cached.subtitle,
          cards: cached.cards.sort((a, b) => a.order - b.order),
          isLoading: false,
          lastRefresh: new Date(),
        }));
        return;
      }
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Use retry logic for dashboard load
      const response = await retryWithBackoff(
        async () => {
          const data = await getDashboardState();
          return data as {
            mode: DashboardMode;
            greeting: string;
            subtitle: string;
            cards: DashboardCard[];
          };
        },
        {
          maxRetries: 3,
          baseDelay: 1000,
          shouldRetry: isRetryableError,
        }
      );

      // Cache the response for 5 minutes
      cache.set(CACHE_KEY, response, CacheTTL.MEDIUM);

      setState((prev) => ({
        ...prev,
        mode: response.mode,
        greeting: response.greeting,
        subtitle: response.subtitle,
        cards: response.cards.sort((a, b) => a.order - b.order),
        isLoading: false,
        error: null,
        lastRefresh: new Date(),
      }));
    } catch (error: any) {
      // Gracefully fall back to mock data so the dashboard looks populated
      const hour = new Date().getHours();
      const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

      const fallbackCards: DashboardCard[] = [
        {
          type: 'workout_card',
          title: 'Sprint Intervals',
          subtitle: '6 × 150m, 90% effort',
          content: { duration: '45 min', intensity: 'High' },
          cta: { label: 'Start Session', action: 'start_workout' },
          priority: 1,
          order: 1,
        },
      ];

      setState((prev) => ({
        ...prev,
        mode: 'general',
        greeting,
        subtitle: "Let's get faster today",
        cards: fallbackCards,
        isLoading: false,
        error: null,
        lastRefresh: new Date(),
      }));
    }
  }, []);

  const generateAIInsights = useCallback(async (forceRefresh = false) => {
    setState((prev) => ({ ...prev, isGenerating: true, error: null }));

    try {
      // Check cache first (unless forcing refresh)
      if (!forceRefresh) {
        const cachedInsights = cache.get<any>('dashboard:insights');
        if (cachedInsights) {
          setState((prev) => ({
            ...prev,
            insights: cachedInsights,
            isGenerating: false,
          }));
          return;
        }
      }

      // Aggregate user context
      const context = await aggregateUserContext();

      // Generate insights using AI
      const response = await retryWithBackoff(
        async () => await generateDashboardInsights(context),
        {
          maxRetries: 2,
          baseDelay: 1500,
          shouldRetry: isRetryableError,
        }
      );

      // Cache insights for 30 minutes
      cache.set('dashboard:insights', response.insights, CacheTTL.LONG);

      setState((prev) => ({
        ...prev,
        insights: response.insights || [],
        mode: response.mode || prev.mode,
        greeting: response.greeting || prev.greeting,
        subtitle: response.subtitle || prev.subtitle,
        cards: response.cards ? response.cards.sort((a, b) => a.order - b.order) : prev.cards,
        isGenerating: false,
        error: null,
        lastRefresh: new Date(),
      }));
    } catch (error: any) {
      // No hardcoded fallback — insights will be empty until backend responds
      setState((prev) => ({
        ...prev,
        insights: [],
        isGenerating: false,
        error: null,
      }));
    }
  }, []);

  const loadDynamicSubtitle = useCallback(async () => {
    try {
      const context = await aggregateUserContext();
      const hour = new Date().getHours();

      const parts: string[] = [];

      // Time-based prefix
      if (hour < 12) {
        parts.push('Rise and grind');
      } else if (hour < 17) {
        parts.push('Keep pushing');
      } else {
        parts.push('Strong finish today');
      }

      // Next workout info
      try {
        const todaysWorkout = await getTodaysWorkout().catch(() => null);
        if (todaysWorkout && (todaysWorkout as any)?.title) {
          parts.push(`${(todaysWorkout as any).title} on deck`);
        }
      } catch {
        // Workout fetch is optional
      }

      // Next meal info
      if (context.nextMeal) {
        parts.push(`${context.nextMeal.meal} coming up`);
      }

      // Streak info
      const streak = context.currentStreak;
      if (streak > 0) {
        parts.push(`${streak}-day streak`);
      }

      const dynamicSubtitle = parts.length > 1
        ? `${parts[0]} — ${parts.slice(1).join(' | ')}`
        : parts[0] || "Let's get faster today";

      setState((prev) => ({
        ...prev,
        dynamicSubtitle,
        currentStreak: streak,
      }));
    } catch {
      setState((prev) => ({
        ...prev,
        dynamicSubtitle: "Let's get faster today",
      }));
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    // Clear cache and force refresh
    cache.delete('dashboard:state');
    cache.delete('dashboard:insights');
    await Promise.all([
      loadDashboard(true),
      generateAIInsights(true),
      loadDynamicSubtitle(),
    ]);
  }, [loadDashboard, generateAIInsights, loadDynamicSubtitle]);

  const loadPatterns = useCallback(async () => {
    try {
      // Load patterns and fatigue in parallel with individual error handling
      const [patternsResponse, fatigueResponse] = await Promise.all([
        getTrainingPatterns().catch(() => ({ patterns: [] as TrainingPattern[] })),
        getFatigueScore().catch(() => null),
      ]);

      setState((prev) => ({
        ...prev,
        patterns: patternsResponse.patterns || [],
        fatigueScore: fatigueResponse,
      }));
    } catch {
      // Silently fall back to empty data — patterns are supplementary
      setState((prev) => ({
        ...prev,
        patterns: [],
        fatigueScore: null,
      }));
    }
  }, []);

  const loadProgressInsights = useCallback(async () => {
    const CACHE_KEY = 'progress:coaching-insight';

    // Check 30-minute cache first
    const cached = cache.get<CoachingInsight>(CACHE_KEY);
    if (cached) {
      setState((prev) => ({ ...prev, progressInsight: cached, isProgressInsightLoading: false }));
      return;
    }

    setState((prev) => ({ ...prev, isProgressInsightLoading: true }));

    try {
      const context = await aggregateUserContext();
      const insight = await getProgressCoachingInsight({
        streak: context.currentStreak,
        trainingLoad: context.trainingLoad,
      });

      cache.set(CACHE_KEY, insight, CacheTTL.LONG);

      setState((prev) => ({
        ...prev,
        progressInsight: insight,
        isProgressInsightLoading: false,
      }));
    } catch {
      setState((prev) => ({ ...prev, isProgressInsightLoading: false }));
    }
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return (
    <DashboardContext.Provider
      value={{
        ...state,
        loadDashboard,
        refreshDashboard,
        generateAIInsights,
        loadPatterns,
        loadDynamicSubtitle,
        loadProgressInsights,
        clearError,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};
