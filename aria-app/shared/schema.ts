import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  json,
  real,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ==================== USERS & AUTHENTICATION ====================

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: varchar('password_hash', { length: 255 }),
  authProvider: varchar('auth_provider', { length: 50 }).default('email'), // email, apple, google
  appleId: varchar('apple_id', { length: 255 }).unique(),
  refreshToken: varchar('refresh_token', { length: 512 }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at'),
});

export const userProfiles = pgTable('user_profiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull().unique(),
  displayName: varchar('display_name', { length: 100 }),
  photoUrl: varchar('photo_url', { length: 500 }),
  sport: varchar('sport', { length: 50 }), // running, track, cycling, swimming, triathlon
  experienceLevel: varchar('experience_level', { length: 50 }), // beginner, intermediate, advanced, elite
  goalTags: json('goal_tags').$type<string[]>().default([]), // ['speed', 'endurance', 'weight_loss', 'first_5k']
  units: varchar('units', { length: 10 }).default('imperial'), // imperial, metric
  dateOfBirth: timestamp('date_of_birth'),
  gender: varchar('gender', { length: 20 }),
  height: real('height'), // in cm
  weight: real('weight'), // in kg
  weeklyGoalDistance: real('weekly_goal_distance'), // in meters
  weeklyGoalDuration: integer('weekly_goal_duration'), // in minutes
  onboardingCompleted: boolean('onboarding_completed').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const userPreferences = pgTable('user_preferences', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull().unique(),
  notificationPrefs: json('notification_prefs').$type<{
    workoutReminders: boolean;
    dailyDigest: boolean;
    weeklyReport: boolean;
    coachingTips: boolean;
    competitionAlerts: boolean;
  }>().default({
    workoutReminders: true,
    dailyDigest: true,
    weeklyReport: true,
    coachingTips: true,
    competitionAlerts: true,
  }),
  privacyPrefs: json('privacy_prefs').$type<{
    shareWorkouts: boolean;
    publicProfile: boolean;
    dataAnalytics: boolean;
  }>().default({
    shareWorkouts: false,
    publicProfile: false,
    dataAnalytics: true,
  }),
  aiCoachingStyle: varchar('ai_coaching_style', { length: 50 }).default('balanced'), // motivational, technical, balanced, minimal
  preferredWorkoutDays: json('preferred_workout_days').$type<string[]>().default([]),
  preferredWorkoutTime: varchar('preferred_workout_time', { length: 20 }), // morning, afternoon, evening
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const connectedDevices = pgTable('connected_devices', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  provider: varchar('provider', { length: 50 }).notNull(), // apple_health, garmin, strava, fitbit
  providerUserId: varchar('provider_user_id', { length: 255 }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  tokenExpiresAt: timestamp('token_expires_at'),
  scopes: json('scopes').$type<string[]>().default([]),
  lastSyncAt: timestamp('last_sync_at'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userProviderIdx: index('connected_devices_user_provider_idx').on(table.userId, table.provider),
}));

// ==================== TRAINING PLANS ====================

export const trainingPlans = pgTable('training_plans', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  planName: varchar('plan_name', { length: 200 }).notNull(),
  description: text('description'),
  targetEventName: varchar('target_event_name', { length: 200 }),
  targetEventDate: timestamp('target_event_date'),
  targetDistance: real('target_distance'), // in meters
  targetTime: integer('target_time'), // in seconds
  status: varchar('status', { length: 20 }).default('active'), // draft, active, completed, cancelled
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  weekCount: integer('week_count'),
  generatedBy: varchar('generated_by', { length: 20 }).default('user'), // user, ai
  aiPlanConfig: json('ai_plan_config').$type<{
    fitnessLevel: string;
    daysPerWeek: number;
    longRunDay: string;
    includeSpeedwork: boolean;
    includeStrength: boolean;
  }>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userStatusIdx: index('training_plans_user_status_idx').on(table.userId, table.status),
}));

export const plannedWorkouts = pgTable('planned_workouts', {
  id: serial('id').primaryKey(),
  planId: integer('plan_id').references(() => trainingPlans.id).notNull(),
  date: timestamp('date').notNull(),
  weekNumber: integer('week_number'),
  dayOfWeek: integer('day_of_week'), // 0-6, Sunday-Saturday
  type: varchar('type', { length: 50 }).notNull(), // easy_run, long_run, intervals, tempo, recovery, rest, cross_training, strength
  title: varchar('title', { length: 200 }),
  description: text('description'),
  structure: json('structure').$type<{
    warmup?: { duration?: number; distance?: number; pace?: string };
    main: Array<{
      type: string; // run, interval, recovery
      duration?: number;
      distance?: number;
      pace?: string;
      effort?: string; // easy, moderate, hard, max
      reps?: number;
      rest?: number;
    }>;
    cooldown?: { duration?: number; distance?: number; pace?: string };
  }>(),
  targetDuration: integer('target_duration'), // in seconds
  targetDistance: real('target_distance'), // in meters
  targetPace: varchar('target_pace', { length: 20 }),
  notes: text('notes'),
  priority: varchar('priority', { length: 20 }).default('normal'), // low, normal, high, key
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  planDateIdx: index('planned_workouts_plan_date_idx').on(table.planId, table.date),
}));

export const workoutCompletions = pgTable('workout_completions', {
  id: serial('id').primaryKey(),
  plannedWorkoutId: integer('planned_workout_id').references(() => plannedWorkouts.id).notNull(),
  actualWorkoutId: integer('actual_workout_id').references(() => workouts.id),
  status: varchar('status', { length: 20 }).default('pending'), // pending, completed, partial, skipped
  complianceScore: real('compliance_score'), // 0-100
  reasonSkipped: text('reason_skipped'),
  feedback: text('feedback'),
  perceivedEffort: integer('perceived_effort'), // 1-10 RPE scale
  mood: varchar('mood', { length: 20 }), // great, good, okay, tired, exhausted
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ==================== WORKOUTS (ACTUAL ACTIVITIES) ====================

export const workouts = pgTable('workouts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  providerSource: varchar('provider_source', { length: 50 }).default('manual'), // manual, apple_health, garmin, strava
  externalId: varchar('external_id', { length: 255 }),
  type: varchar('type', { length: 50 }).notNull(), // run, walk, bike, swim, strength, cross_training
  title: varchar('title', { length: 200 }),
  description: text('description'),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time'),
  timezone: varchar('timezone', { length: 50 }),
  durationSeconds: integer('duration_seconds'),
  distanceMeters: real('distance_meters'),
  elevationGainMeters: real('elevation_gain_meters'),
  avgPace: varchar('avg_pace', { length: 20 }), // min/km or min/mi
  avgSpeed: real('avg_speed'), // m/s
  maxSpeed: real('max_speed'),
  avgHeartRate: integer('avg_heart_rate'),
  maxHeartRate: integer('max_heart_rate'),
  avgCadence: integer('avg_cadence'), // steps per minute
  calories: integer('calories'),
  splits: json('splits').$type<Array<{
    distance: number;
    duration: number;
    pace: string;
    avgHr?: number;
    elevationChange?: number;
  }>>(),
  weatherConditions: json('weather_conditions').$type<{
    temperature?: number;
    humidity?: number;
    windSpeed?: number;
    conditions?: string;
  }>(),
  gpsRoute: json('gps_route').$type<Array<{
    lat: number;
    lng: number;
    elevation?: number;
    timestamp?: string;
  }>>(),
  notes: text('notes'),
  isPrivate: boolean('is_private').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userStartTimeIdx: index('workouts_user_start_time_idx').on(table.userId, table.startTime),
  userTypeIdx: index('workouts_user_type_idx').on(table.userId, table.type),
}));

export const workoutSamples = pgTable('workout_samples', {
  id: serial('id').primaryKey(),
  workoutId: integer('workout_id').references(() => workouts.id).notNull(),
  timestamp: timestamp('timestamp').notNull(),
  heartRate: integer('heart_rate'),
  pace: real('pace'), // seconds per meter
  cadence: integer('cadence'),
  latitude: real('latitude'),
  longitude: real('longitude'),
  elevation: real('elevation'),
  power: integer('power'), // watts, for cycling
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  workoutTimestampIdx: index('workout_samples_workout_timestamp_idx').on(table.workoutId, table.timestamp),
}));

// ==================== LIVE SESSION STATE ====================

export const workoutSessions = pgTable('workout_sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  plannedWorkoutId: integer('planned_workout_id').references(() => plannedWorkouts.id),
  status: varchar('status', { length: 20 }).default('pending'), // pending, warmup, active, paused, cooldown, completed, cancelled
  currentPhase: varchar('current_phase', { length: 50 }),
  currentIntervalIndex: integer('current_interval_index').default(0),
  startedAt: timestamp('started_at'),
  pausedAt: timestamp('paused_at'),
  completedAt: timestamp('completed_at'),
  totalPausedDuration: integer('total_paused_duration').default(0), // seconds
  liveMetrics: json('live_metrics').$type<{
    distance: number;
    duration: number;
    currentPace: string;
    avgPace: string;
    currentHr: number;
    avgHr: number;
    calories: number;
    currentCadence: number;
  }>(),
  checkpoints: json('checkpoints').$type<Array<{
    timestamp: string;
    distance: number;
    duration: number;
    heartRate?: number;
    pace?: string;
  }>>().default([]),
  finalWorkoutId: integer('final_workout_id').references(() => workouts.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userStatusIdx: index('workout_sessions_user_status_idx').on(table.userId, table.status),
}));

// ==================== DASHBOARD & INSIGHTS ====================

export const insights = pgTable('insights', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // fatigue_warning, pr_prediction, streak, recovery_needed, competition_ready, weekly_summary
  title: varchar('title', { length: 200 }).notNull(),
  message: text('message'),
  priority: varchar('priority', { length: 20 }).default('normal'), // low, normal, high, urgent
  payload: json('payload').$type<Record<string, any>>(),
  actionType: varchar('action_type', { length: 50 }), // start_workout, view_plan, rest, hydrate
  actionData: json('action_data').$type<Record<string, any>>(),
  isRead: boolean('is_read').default(false),
  isDismissed: boolean('is_dismissed').default(false),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userTypeIdx: index('insights_user_type_idx').on(table.userId, table.type),
  userExpiresIdx: index('insights_user_expires_idx').on(table.userId, table.expiresAt),
}));

export const dashboardStates = pgTable('dashboard_states', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull().unique(),
  mode: varchar('mode', { length: 50 }).notNull(), // general, workout_ready, competition_day, recovery_focus, rest_day
  greeting: varchar('greeting', { length: 200 }),
  subtitle: varchar('subtitle', { length: 500 }),
  cards: json('cards').$type<Array<{
    type: string; // workout_card, stats_row, insight_card, competition_card, streak_card
    title?: string;
    subtitle?: string;
    content?: any;
    cta?: { label: string; action: string; data?: any };
    order: number;
  }>>().default([]),
  generatedBy: varchar('generated_by', { length: 20 }).default('rules'), // rules, ai
  generatedAt: timestamp('generated_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// ==================== AI CONVERSATIONS ====================

export const ariaConversations = pgTable('aria_conversations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  title: varchar('title', { length: 200 }).default('New Conversation'),
  isArchived: boolean('is_archived').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userCreatedIdx: index('aria_conversations_user_created_idx').on(table.userId, table.createdAt),
}));

export const ariaMessages = pgTable('aria_messages', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversation_id').references(() => ariaConversations.id).notNull(),
  role: varchar('role', { length: 20 }).notNull(), // user, assistant, system
  content: text('content').notNull(),
  promptCost: integer('prompt_cost').default(0),
  metadata: json('metadata').$type<{
    model?: string;
    tokens?: number;
    latencyMs?: number;
    contextUsed?: string[];
  }>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  conversationCreatedIdx: index('aria_messages_conversation_created_idx').on(table.conversationId, table.createdAt),
}));

// ==================== RACES & CALENDAR ====================

export const races = pgTable('races', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  distance: real('distance'), // in meters
  distanceLabel: varchar('distance_label', { length: 50 }), // 5K, 10K, Half Marathon, Marathon
  date: timestamp('date').notNull(),
  location: varchar('location', { length: 200 }),
  goalTime: integer('goal_time'), // in seconds
  notes: text('notes'),
  isCompleted: boolean('is_completed').default(false),
  finishTime: integer('finish_time'), // actual finish time in seconds
  finishPlace: integer('finish_place'),
  ageGroupPlace: integer('age_group_place'),
  workoutId: integer('workout_id').references(() => workouts.id), // linked workout if available
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userDateIdx: index('races_user_date_idx').on(table.userId, table.date),
}));

// ==================== RELATIONS ====================

export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(userProfiles, {
    fields: [users.id],
    references: [userProfiles.userId],
  }),
  preferences: one(userPreferences, {
    fields: [users.id],
    references: [userPreferences.userId],
  }),
  connectedDevices: many(connectedDevices),
  trainingPlans: many(trainingPlans),
  workouts: many(workouts),
  workoutSessions: many(workoutSessions),
  insights: many(insights),
  dashboardState: one(dashboardStates, {
    fields: [users.id],
    references: [dashboardStates.userId],
  }),
  ariaConversations: many(ariaConversations),
  races: many(races),
}));

export const userProfilesRelations = relations(userProfiles, ({ one }) => ({
  user: one(users, {
    fields: [userProfiles.userId],
    references: [users.id],
  }),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(users, {
    fields: [userPreferences.userId],
    references: [users.id],
  }),
}));

export const connectedDevicesRelations = relations(connectedDevices, ({ one }) => ({
  user: one(users, {
    fields: [connectedDevices.userId],
    references: [users.id],
  }),
}));

export const trainingPlansRelations = relations(trainingPlans, ({ one, many }) => ({
  user: one(users, {
    fields: [trainingPlans.userId],
    references: [users.id],
  }),
  plannedWorkouts: many(plannedWorkouts),
}));

export const plannedWorkoutsRelations = relations(plannedWorkouts, ({ one, many }) => ({
  plan: one(trainingPlans, {
    fields: [plannedWorkouts.planId],
    references: [trainingPlans.id],
  }),
  completions: many(workoutCompletions),
}));

export const workoutCompletionsRelations = relations(workoutCompletions, ({ one }) => ({
  plannedWorkout: one(plannedWorkouts, {
    fields: [workoutCompletions.plannedWorkoutId],
    references: [plannedWorkouts.id],
  }),
  actualWorkout: one(workouts, {
    fields: [workoutCompletions.actualWorkoutId],
    references: [workouts.id],
  }),
}));

export const workoutsRelations = relations(workouts, ({ one, many }) => ({
  user: one(users, {
    fields: [workouts.userId],
    references: [users.id],
  }),
  samples: many(workoutSamples),
  completions: many(workoutCompletions),
  race: one(races),
}));

export const workoutSamplesRelations = relations(workoutSamples, ({ one }) => ({
  workout: one(workouts, {
    fields: [workoutSamples.workoutId],
    references: [workouts.id],
  }),
}));

export const workoutSessionsRelations = relations(workoutSessions, ({ one }) => ({
  user: one(users, {
    fields: [workoutSessions.userId],
    references: [users.id],
  }),
  plannedWorkout: one(plannedWorkouts, {
    fields: [workoutSessions.plannedWorkoutId],
    references: [plannedWorkouts.id],
  }),
  finalWorkout: one(workouts, {
    fields: [workoutSessions.finalWorkoutId],
    references: [workouts.id],
  }),
}));

export const insightsRelations = relations(insights, ({ one }) => ({
  user: one(users, {
    fields: [insights.userId],
    references: [users.id],
  }),
}));

export const dashboardStatesRelations = relations(dashboardStates, ({ one }) => ({
  user: one(users, {
    fields: [dashboardStates.userId],
    references: [users.id],
  }),
}));

export const ariaConversationsRelations = relations(ariaConversations, ({ one, many }) => ({
  user: one(users, {
    fields: [ariaConversations.userId],
    references: [users.id],
  }),
  messages: many(ariaMessages),
}));

export const ariaMessagesRelations = relations(ariaMessages, ({ one }) => ({
  conversation: one(ariaConversations, {
    fields: [ariaMessages.conversationId],
    references: [ariaConversations.id],
  }),
}));

export const racesRelations = relations(races, ({ one }) => ({
  user: one(users, {
    fields: [races.userId],
    references: [users.id],
  }),
  workout: one(workouts, {
    fields: [races.workoutId],
    references: [workouts.id],
  }),
}));

// ==================== TYPE EXPORTS ====================

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

export type UserPreferences = typeof userPreferences.$inferSelect;
export type InsertUserPreferences = typeof userPreferences.$inferInsert;

export type ConnectedDevice = typeof connectedDevices.$inferSelect;
export type InsertConnectedDevice = typeof connectedDevices.$inferInsert;

export type TrainingPlan = typeof trainingPlans.$inferSelect;
export type InsertTrainingPlan = typeof trainingPlans.$inferInsert;

export type PlannedWorkout = typeof plannedWorkouts.$inferSelect;
export type InsertPlannedWorkout = typeof plannedWorkouts.$inferInsert;

export type WorkoutCompletion = typeof workoutCompletions.$inferSelect;
export type InsertWorkoutCompletion = typeof workoutCompletions.$inferInsert;

export type Workout = typeof workouts.$inferSelect;
export type InsertWorkout = typeof workouts.$inferInsert;

export type WorkoutSample = typeof workoutSamples.$inferSelect;
export type InsertWorkoutSample = typeof workoutSamples.$inferInsert;

export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type InsertWorkoutSession = typeof workoutSessions.$inferInsert;

export type Insight = typeof insights.$inferSelect;
export type InsertInsight = typeof insights.$inferInsert;

export type DashboardState = typeof dashboardStates.$inferSelect;
export type InsertDashboardState = typeof dashboardStates.$inferInsert;

export type AriaConversation = typeof ariaConversations.$inferSelect;
export type InsertAriaConversation = typeof ariaConversations.$inferInsert;

export type AriaMessage = typeof ariaMessages.$inferSelect;
export type InsertAriaMessage = typeof ariaMessages.$inferInsert;

export type Race = typeof races.$inferSelect;
export type InsertRace = typeof races.$inferInsert;
