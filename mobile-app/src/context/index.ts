export { AuthProvider, useAuth } from './AuthContext';
export { WorkoutProvider, useWorkout } from './WorkoutContext';
export { ChatProvider, useChat } from './ChatContext';
export { DashboardProvider, useDashboard } from './DashboardContext';
export { NutritionProvider, useNutrition } from './NutritionContext';
export { ProgramsProvider, usePrograms } from './ProgramsContext';
export { SessionProvider, useSession } from './SessionContext';
export { ThemeProvider, useTheme } from './ThemeContext';
export type { ThemeMode } from './ThemeContext';
export { EventsProvider, useEvents } from './EventsContext';
export { HealthProvider, useHealth } from './HealthContext';
export { AppProviders } from './AppContext';

// Re-export types
export type { User, UserProfile, UserPreferences } from './AuthContext';
export type { TrainingPlan, PlannedWorkout, Workout, WorkoutSession } from './WorkoutContext';
export type { Message, Conversation } from './ChatContext';
export type { DashboardCard, DashboardMode } from './DashboardContext';
export type { NutritionPlan, NutritionLogEntry } from './NutritionContext';
export type { Program, ProgramSession } from './ProgramsContext';
export type { Event } from './EventsContext';
export type { IntegrationProvider, ConnectedDevice, ReadinessData } from './HealthContext';
