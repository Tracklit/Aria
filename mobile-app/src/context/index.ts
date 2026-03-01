export { AuthProvider, useAuth } from './AuthContext';
export { WorkoutProvider, useWorkout } from './WorkoutContext';
export { ChatProvider, useChat } from './ChatContext';
export { DashboardProvider, useDashboard } from './DashboardContext';
export { AppProviders } from './AppContext';

// Re-export types
export type { User, UserProfile, UserPreferences } from './AuthContext';
export type { TrainingPlan, PlannedWorkout, Workout, WorkoutSession } from './WorkoutContext';
export type { Message, Conversation } from './ChatContext';
export type { DashboardCard, DashboardMode } from './DashboardContext';
