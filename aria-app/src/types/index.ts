// ==================== USER TYPES ====================

export interface User {
  id: number;
  email: string;
  authProvider: 'email' | 'apple' | 'google';
  createdAt: string;
  lastLoginAt: string | null;
}

export interface UserProfile {
  id: number;
  userId: number;
  displayName: string | null;
  photoUrl: string | null;
  sport: 'running' | 'track' | 'cycling' | 'swimming' | 'triathlon' | null;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'elite' | null;
  goalTags: string[];
  units: 'imperial' | 'metric';
  dateOfBirth: string | null;
  gender: string | null;
  height: number | null;
  weight: number | null;
  weeklyGoalDistance: number | null;
  weeklyGoalDuration: number | null;
  onboardingCompleted: boolean;
}

export interface UserPreferences {
  id: number;
  userId: number;
  notificationPrefs: {
    workoutReminders: boolean;
    dailyDigest: boolean;
    weeklyReport: boolean;
    coachingTips: boolean;
    competitionAlerts: boolean;
  };
  privacyPrefs: {
    shareWorkouts: boolean;
    publicProfile: boolean;
    dataAnalytics: boolean;
  };
  aiCoachingStyle: 'motivational' | 'technical' | 'balanced' | 'minimal';
  preferredWorkoutDays: string[];
  preferredWorkoutTime: 'morning' | 'afternoon' | 'evening' | null;
}

// ==================== TRAINING TYPES ====================

export interface TrainingPlan {
  id: number;
  userId: number;
  planName: string;
  description: string | null;
  targetEventName: string | null;
  targetEventDate: string | null;
  targetDistance: number | null;
  targetTime: number | null;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  startDate: string | null;
  endDate: string | null;
  weekCount: number | null;
  generatedBy: 'user' | 'ai';
}

export interface PlannedWorkout {
  id: number;
  planId: number;
  date: string;
  weekNumber: number | null;
  dayOfWeek: number | null;
  type: WorkoutType;
  title: string | null;
  description: string | null;
  structure: WorkoutStructure | null;
  targetDuration: number | null;
  targetDistance: number | null;
  targetPace: string | null;
  notes: string | null;
  priority: 'low' | 'normal' | 'high' | 'key';
}

export type WorkoutType =
  | 'easy_run'
  | 'long_run'
  | 'intervals'
  | 'tempo'
  | 'recovery'
  | 'rest'
  | 'cross_training'
  | 'strength';

export interface WorkoutStructure {
  warmup?: { duration?: number; distance?: number; pace?: string };
  main: WorkoutSegment[];
  cooldown?: { duration?: number; distance?: number; pace?: string };
}

export interface WorkoutSegment {
  type: 'run' | 'interval' | 'recovery';
  duration?: number;
  distance?: number;
  pace?: string;
  effort?: 'easy' | 'moderate' | 'hard' | 'max';
  reps?: number;
  rest?: number;
}

// ==================== WORKOUT TYPES ====================

export interface Workout {
  id: number;
  userId: number;
  providerSource: 'manual' | 'apple_health' | 'garmin' | 'strava';
  externalId: string | null;
  type: string;
  title: string | null;
  description: string | null;
  startTime: string;
  endTime: string | null;
  timezone: string | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  elevationGainMeters: number | null;
  avgPace: string | null;
  avgSpeed: number | null;
  maxSpeed: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  avgCadence: number | null;
  calories: number | null;
  splits: WorkoutSplit[] | null;
  notes: string | null;
}

export interface WorkoutSplit {
  distance: number;
  duration: number;
  pace: string;
  avgHr?: number;
  elevationChange?: number;
}

export interface WorkoutSession {
  id: number;
  userId: number;
  plannedWorkoutId: number | null;
  status: 'pending' | 'warmup' | 'active' | 'paused' | 'cooldown' | 'completed' | 'cancelled';
  currentPhase: string | null;
  currentIntervalIndex: number;
  startedAt: string | null;
  pausedAt: string | null;
  completedAt: string | null;
  totalPausedDuration: number;
  liveMetrics: LiveMetrics | null;
  checkpoints: Checkpoint[];
}

export interface LiveMetrics {
  distance: number;
  duration: number;
  currentPace: string;
  avgPace: string;
  currentHr: number;
  avgHr: number;
  calories: number;
  currentCadence: number;
}

export interface Checkpoint {
  timestamp: string;
  distance: number;
  duration: number;
  heartRate?: number;
  pace?: string;
}

// ==================== CHAT TYPES ====================

export interface Message {
  id: string;
  text: string;
  timestamp: Date;
  sender: 'ai' | 'user';
}

export interface Conversation {
  id: number;
  userId: number;
  title: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

// ==================== DASHBOARD TYPES ====================

export type DashboardMode =
  | 'general'
  | 'workout_ready'
  | 'competition_day'
  | 'recovery_focus'
  | 'rest_day';

export interface DashboardState {
  mode: DashboardMode;
  greeting: string;
  subtitle: string;
  cards: DashboardCard[];
}

export interface DashboardCard {
  type: 'workout_card' | 'stats_row' | 'insight_card' | 'competition_card' | 'streak_card';
  title?: string;
  subtitle?: string;
  content?: any;
  cta?: { label: string; action: string; data?: any };
  order: number;
}

// ==================== RACE TYPES ====================

export interface Race {
  id: number;
  userId: number;
  name: string;
  distance: number | null;
  distanceLabel: string | null;
  date: string;
  location: string | null;
  goalTime: number | null;
  notes: string | null;
  isCompleted: boolean;
  finishTime: number | null;
  finishPlace: number | null;
  ageGroupPlace: number | null;
  workoutId: number | null;
}

// ==================== INSIGHT TYPES ====================

export type InsightType =
  | 'fatigue_warning'
  | 'pr_prediction'
  | 'streak'
  | 'recovery_needed'
  | 'competition_ready'
  | 'weekly_summary';

export interface Insight {
  id: number;
  userId: number;
  type: InsightType;
  title: string;
  message: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  payload: Record<string, any> | null;
  actionType: string | null;
  actionData: Record<string, any> | null;
  isRead: boolean;
  isDismissed: boolean;
  expiresAt: string | null;
  createdAt: string;
}

// ==================== ANALYTICS TYPES ====================

export interface WeeklyStats {
  totalDistance: number;
  totalDuration: number;
  workoutCount: number;
  avgPace: string | null;
}

export interface TrendData {
  weekStart: string;
  totalDistance: number;
  totalDuration: number;
  workoutCount: number;
  avgPace: string | null;
}

// ==================== LEGACY TYPES (for backwards compatibility) ====================

export interface DayWorkout {
  day: string;
  type: string;
  duration?: string;
  details?: string;
}

export interface WorkoutMetrics {
  type: string;
  duration: number;
  distance: number;
  pace: string;
  heartRate: number;
  spm?: number;
  status: 'active' | 'recovery' | 'paused';
}

export interface CompetitionDay {
  isCompetitionDay: boolean;
  race?: {
    name: string;
    distance: string;
    diet: string[];
    tips: string[];
  };
}
