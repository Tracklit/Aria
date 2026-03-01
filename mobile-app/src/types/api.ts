/**
 * API TypeScript types for Aria
 * Matches TrackLitRN backend API responses
 */

// ============================================================================
// Authentication
// ============================================================================

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  displayName?: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    username: string;
    email: string;
    name?: string;
    subscriptionTier?: string;
    sprinthiaPrompts?: number;
  };
}

// ============================================================================
// User & Profile
// ============================================================================

export interface User {
  id: number;
  username: string;
  email: string;
  name?: string;
  subscriptionTier?: string;
  sprinthiaPrompts?: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: number;
  userId: number;
  displayName: string | null;
  photoUrl: string | null;
  sport: 'running' | 'cycling' | 'swimming' | 'triathlon' | null;
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'elite' | null;
  goalTags: string[];
  units: 'imperial' | 'metric';
  dateOfBirth: string | null;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  height: number | null; // cm
  weight: number | null; // kg
  weeklyGoalDistance: number | null;
  weeklyGoalDuration: number | null; // minutes
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileRequest {
  displayName?: string;
  sport?: string;
  experienceLevel?: string;
  goalTags?: string[];
  units?: string;
  dateOfBirth?: string;
  gender?: string;
  height?: number;
  weight?: number;
  weeklyGoalDistance?: number;
  weeklyGoalDuration?: number;
}

export interface ProfilePictureResponse {
  profileImageUrl: string;
}

// ============================================================================
// Dashboard
// ============================================================================

export interface DashboardState {
  mode: 'general' | 'workout_ready' | 'competition_day' | 'recovery_focus' | 'rest_day';
  greeting: string;
  subtitle: string;
  cards: DashboardCard[];
}

export interface DashboardCard {
  type: 'workout_card' | 'insight_card' | 'competition_card' | 'streak_card' | 'stats_row';
  title: string;
  subtitle?: string;
  content: DashboardCardContent;
  cta?: {
    label: string;
    action: string;
    data?: any;
  };
  priority: number;
  order: number;
}

export type DashboardCardContent =
  | WorkoutCardContent
  | InsightCardContent
  | CompetitionCardContent
  | StreakCardContent
  | StatsRowContent;

export interface WorkoutCardContent {
  details: Array<{
    icon: string;
    text: string;
  }>;
}

export interface InsightCardContent {
  tips?: string[];
  analysis?: string;
}

export interface CompetitionCardContent {
  daysUntil: number;
  tips?: string;
  raceName?: string;
  raceDate?: string;
}

export interface StreakCardContent {
  days: number;
  message: string;
  nextMilestone?: number;
}

export interface StatsRowContent {
  stats: Array<{
    value: string | number;
    label: string;
    change?: number; // percentage change
  }>;
}

// ============================================================================
// Chat
// ============================================================================

export interface ChatInput {
  message: string;
  conversationId?: number;
  stream?: boolean;
}

export interface ChatResponse {
  response: string;
  conversationId: number;
  messageId?: number;
}

export interface Conversation {
  id: number;
  userId: number;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  role: 'user' | 'assistant';
  content: string;
  tokens?: number;
  createdAt: string;
}

// ============================================================================
// Workouts
// ============================================================================

export interface Workout {
  id: number;
  userId: number;
  type: string;
  sport: string;
  title: string;
  description?: string;
  plannedDate?: string;
  completedDate?: string;
  duration: number; // seconds
  distance: number; // meters
  avgPace?: string; // mm:ss per km/mi
  avgHeartRate?: number;
  maxHeartRate?: number;
  avgCadence?: number;
  elevationGain?: number; // meters
  calories?: number;
  perceivedEffort?: number; // 1-10
  notes?: string;
  status: 'planned' | 'active' | 'completed' | 'skipped';
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutSession {
  id: number;
  workoutId: number;
  userId: number;
  status: 'active' | 'paused' | 'completed';
  startTime: string;
  endTime?: string;
  liveMetrics: WorkoutMetrics;
  gpsTrack?: GpsPoint[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutMetrics {
  duration: number; // seconds
  distance: number; // meters
  avgPace: string; // mm:ss per km/mi
  currentPace?: string;
  avgHr?: number;
  currentHr?: number;
  currentCadence?: number;
  calories?: number;
}

export interface GpsPoint {
  latitude: number;
  longitude: number;
  altitude: number;
  timestamp: string;
  accuracy: number;
}

export interface CreateWorkoutRequest {
  type: string;
  sport: string;
  title: string;
  description?: string;
  plannedDate?: string;
  duration?: number;
  distance?: number;
}

export interface UpdateWorkoutRequest {
  title?: string;
  description?: string;
  plannedDate?: string;
  status?: string;
}

export interface CompleteWorkoutRequest {
  completedDate: string;
  duration: number;
  distance: number;
  avgPace?: string;
  avgHeartRate?: number;
  maxHeartRate?: number;
  avgCadence?: number;
  elevationGain?: number;
  calories?: number;
  perceivedEffort?: number;
  notes?: string;
}

// ============================================================================
// Training Plans
// ============================================================================

export interface TrainingPlan {
  id: number;
  userId: number;
  name: string;
  description?: string;
  sport: string;
  startDate: string;
  endDate: string;
  goalEvent?: string;
  goalEventDate?: string;
  weeks: number;
  status: 'draft' | 'active' | 'completed';
  workouts: PlannedWorkout[];
  createdAt: string;
  updatedAt: string;
}

export interface PlannedWorkout {
  id: number;
  trainingPlanId: number;
  weekNumber: number;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  type: string;
  title: string;
  description?: string;
  duration?: number;
  distance?: number;
  intensity?: 'easy' | 'moderate' | 'hard' | 'race_pace';
  notes?: string;
  completed: boolean;
  workoutId?: number; // Reference to actual workout if completed
}

// ============================================================================
// Analytics
// ============================================================================

export interface AnalyticsSummary {
  userId: number;
  period: 'week' | 'month' | 'year';
  startDate: string;
  endDate: string;
  totalDistance: number; // meters
  totalDuration: number; // seconds
  totalWorkouts: number;
  avgPace?: string;
  avgHeartRate?: number;
  totalCalories?: number;
  totalElevationGain?: number;
}

export interface TrendData {
  date: string;
  value: number;
  label?: string;
}

export interface PerformanceMetrics {
  vo2Max?: number;
  trainingLoad: number;
  fitnessLevel?: number;
  fatigueLevel?: number;
  formLevel?: number;
  injuryRisk?: 'low' | 'medium' | 'high';
}

// ============================================================================
// AI Insights & Context
// ============================================================================

/**
 * AI-generated insight for dashboard
 */
export interface AIInsight {
  id: string;
  type: 'warning' | 'tip' | 'prediction' | 'encouragement';
  title: string;
  message: string;
  confidence: number; // 0-1 (0-100%)
  priority: number; // 1-10 (1 = highest priority)
  actionable: boolean;
  suggestedAction?: string;
  createdAt?: string;
}

/**
 * Aggregated user context for AI insight generation
 * (Re-exported from contextAggregator.ts)
 */
export interface AggregatedContext {
  profile: UserProfile;
  recentWorkouts: Workout[];
  upcomingRaces: Race[];
  weeklyStats: WeeklyStats;
  chatHistory: ChatMessage[];
  currentStreak: number;
  trainingLoad: number;
  aggregatedAt: Date;
}

/**
 * Request to generate AI insights
 */
export interface GenerateInsightsRequest {
  context: AggregatedContext;
  maxInsights?: number; // Default: 5
  priorities?: string[]; // Filter by specific priorities
}

/**
 * Response from AI insight generation
 */
export interface GenerateInsightsResponse {
  mode: 'general' | 'workout_ready' | 'competition_day' | 'recovery_focus' | 'rest_day';
  greeting: string;
  subtitle: string;
  cards: DashboardCard[];
  insights: AIInsight[];
}

/**
 * Training pattern detected by AI
 */
export interface TrainingPattern {
  type: 'overtraining' | 'undertraining' | 'peaking' | 'plateau' | 'consistent' | 'improving';
  confidence: number; // 0-1
  description: string;
  recommendation: string;
  detectedAt: string;
  severity?: 'low' | 'medium' | 'high';
}

/**
 * Training patterns response
 */
export interface TrainingPatternsResponse {
  patterns: TrainingPattern[];
}

/**
 * Fatigue score assessment
 */
export interface FatigueScore {
  score: number; // 0-100 (0 = fully rested, 100 = exhausted)
  trend: 'increasing' | 'stable' | 'decreasing';
  recommendation: string;
  factors: string[]; // Contributing factors
  riskLevel?: 'low' | 'medium' | 'high';
}

/**
 * Weekly statistics
 */
export interface WeeklyStats {
  totalDistance: number; // meters
  totalDuration: number; // seconds
  workoutCount: number;
  avgPace: string; // mm:ss per km/mi
  weekStart?: string;
  weekEnd?: string;
}

// ============================================================================
// Social
// ============================================================================

export interface UserPublicProfile {
  id: number;
  username: string;
  displayName: string;
  photoUrl: string | null;
  sport: string | null;
  isFollowing: boolean;
  followersCount: number;
  followingCount: number;
  totalWorkouts: number;
  totalDistance: number;
  memberSince: string;
}

export interface ActivityFeedItem {
  id: number;
  type: 'workout' | 'achievement' | 'comment' | 'like';
  userId: number;
  user: {
    username: string;
    displayName: string;
    photoUrl: string | null;
  };
  content: any;
  timestamp: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
}

// ============================================================================
// Achievements & Gamification
// ============================================================================

export interface Achievement {
  id: number;
  name: string;
  description: string;
  iconUrl: string;
  category: 'distance' | 'speed' | 'consistency' | 'milestone';
  requirement: any;
  rewardXp: number;
  rewardSpikes?: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface UserAchievement {
  id: number;
  userId: number;
  achievementId: number;
  achievement: Achievement;
  unlockedAt: string;
  progress?: number; // 0-100
}

export interface UserStats {
  userId: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  spikes: number; // in-app currency
  currentStreak: number;
  longestStreak: number;
  totalWorkouts: number;
  totalDistance: number;
  totalDuration: number;
}

// ============================================================================
// Races & Events
// ============================================================================

export interface Race {
  id: number;
  name: string;
  description?: string;
  sport: string;
  distance: number; // meters
  date: string;
  location: string;
  registrationUrl?: string;
  isRegistered: boolean;
  participantCount?: number;
}

export interface RaceResult {
  id: number;
  raceId: number;
  userId: number;
  finishTime: number; // seconds
  overallPlace?: number;
  genderPlace?: number;
  ageGroupPlace?: number;
  notes?: string;
  createdAt: string;
}

// ============================================================================
// Equipment
// ============================================================================

export interface Equipment {
  id: number;
  userId: number;
  type: 'shoes' | 'bike' | 'wetsuit' | 'other';
  brand: string;
  model: string;
  nickname?: string;
  purchaseDate?: string;
  retirementDate?: string;
  currentMileage: number; // meters
  maxMileage?: number; // meters - when to replace
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// API Error Response
// ============================================================================

export interface ApiError {
  error: string;
  message?: string;
  statusCode: number;
  timestamp: string;
  path?: string;
}

// ============================================================================
// Pagination
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ============================================================================
// Type Guards
// ============================================================================

export function isApiError(error: any): error is ApiError {
  return error && typeof error.error === 'string' && typeof error.statusCode === 'number';
}

export function isDashboardCard(card: any): card is DashboardCard {
  return (
    card &&
    typeof card.type === 'string' &&
    typeof card.title === 'string' &&
    typeof card.priority === 'number' &&
    typeof card.order === 'number'
  );
}

export function isWorkout(workout: any): workout is Workout {
  return (
    workout &&
    typeof workout.id === 'number' &&
    typeof workout.userId === 'number' &&
    typeof workout.type === 'string' &&
    typeof workout.status === 'string'
  );
}
