import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  getDashboardState,
  generateDashboardInsights,
  getTrainingPatterns,
  getFatigueScore,
} from '../lib/api';
import { aggregateUserContext } from '../lib/contextAggregator';
import { ToastManager } from '../components/Toast';
import { cache, CacheTTL } from '../lib/cache';
import { retryWithBackoff, isRetryableError } from '../lib/retry';
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
  cards: DashboardCard[];
  insights: AIInsight[];
  patterns: TrainingPattern[];
  fatigueScore: FatigueScore | null;
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
  lastRefresh: Date | null;
}

interface DashboardContextType extends DashboardState {
  loadDashboard: () => Promise<void>;
  refreshDashboard: () => Promise<void>;
  generateAIInsights: () => Promise<void>;
  loadPatterns: () => Promise<void>;
  clearError: () => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<DashboardState>({
    mode: 'general',
    greeting: '',
    subtitle: '',
    cards: [],
    insights: [],
    patterns: [],
    fatigueScore: null,
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
      console.error('[Dashboard] Failed to load dashboard:', error);

      // Provide more specific error messages
      let errorMessage = 'Failed to load dashboard insights';
      if (error.message?.includes('Network')) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        errorMessage = 'Session expired. Please log in again.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      ToastManager.error(errorMessage);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, []);

  const refreshDashboard = useCallback(async () => {
    // Clear cache and force refresh
    cache.delete('dashboard:state');
    await loadDashboard(true);
  }, [loadDashboard]);

  const generateAIInsights = useCallback(async () => {
    setState((prev) => ({ ...prev, isGenerating: true, error: null }));

    try {
      // Check cache first
      const cachedInsights = cache.get<any>('dashboard:insights');
      if (cachedInsights) {
        setState((prev) => ({
          ...prev,
          insights: cachedInsights,
          isGenerating: false,
        }));
        return;
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
      console.error('[Dashboard] Failed to generate AI insights:', error);

      // Provide specific error messages
      let errorMessage = 'Failed to generate insights';
      if (error.message?.includes('Network') || error.message?.includes('fetch')) {
        errorMessage = 'Unable to reach server. Check your connection.';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Insight generation timed out. Try again later.';
      } else if (error.message?.includes('rate limit')) {
        errorMessage = 'Too many requests. Please wait a moment.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      ToastManager.error(errorMessage);
      setState((prev) => ({
        ...prev,
        isGenerating: false,
        error: errorMessage,
      }));
    }
  }, []);

  const loadPatterns = useCallback(async () => {
    try {
      // Load patterns and fatigue in parallel with individual error handling
      const [patternsResponse, fatigueResponse] = await Promise.all([
        getTrainingPatterns().catch((err) => {
          console.warn('[Dashboard] Failed to load patterns:', err);
          return { patterns: [] };
        }),
        getFatigueScore().catch((err) => {
          console.warn('[Dashboard] Failed to load fatigue score:', err);
          return null;
        }),
      ]);

      setState((prev) => ({
        ...prev,
        patterns: patternsResponse.patterns || [],
        fatigueScore: fatigueResponse,
      }));
    } catch (error: any) {
      console.error('[Dashboard] Failed to load patterns:', error);
      // Don't show error toast for patterns - they're supplementary
      // Just log and continue with empty data
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
