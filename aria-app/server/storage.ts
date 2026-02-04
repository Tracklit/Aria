import { db } from './db';
import { eq, and, desc, asc, gte, lte, sql, isNull } from 'drizzle-orm';
import {
  users,
  userProfiles,
  userPreferences,
  connectedDevices,
  trainingPlans,
  plannedWorkouts,
  workoutCompletions,
  workouts,
  workoutSamples,
  workoutSessions,
  insights,
  dashboardStates,
  ariaConversations,
  ariaMessages,
  races,
  User,
  InsertUser,
  UserProfile,
  InsertUserProfile,
  UserPreferences,
  InsertUserPreferences,
  ConnectedDevice,
  InsertConnectedDevice,
  TrainingPlan,
  InsertTrainingPlan,
  PlannedWorkout,
  InsertPlannedWorkout,
  WorkoutCompletion,
  InsertWorkoutCompletion,
  Workout,
  InsertWorkout,
  WorkoutSample,
  InsertWorkoutSample,
  WorkoutSession,
  InsertWorkoutSession,
  Insight,
  InsertInsight,
  DashboardState,
  InsertDashboardState,
  AriaConversation,
  InsertAriaConversation,
  AriaMessage,
  InsertAriaMessage,
  Race,
  InsertRace,
} from '../shared/schema';

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByAppleId(appleId: string): Promise<User | undefined>;
  createUser(data: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined>;
  updateUserRefreshToken(id: number, token: string | null, expiresAt: Date | null): Promise<void>;

  // User Profiles
  getUserProfile(userId: number): Promise<UserProfile | undefined>;
  createUserProfile(data: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(userId: number, data: Partial<InsertUserProfile>): Promise<UserProfile | undefined>;

  // User Preferences
  getUserPreferences(userId: number): Promise<UserPreferences | undefined>;
  createUserPreferences(data: InsertUserPreferences): Promise<UserPreferences>;
  updateUserPreferences(userId: number, data: Partial<InsertUserPreferences>): Promise<UserPreferences | undefined>;

  // Connected Devices
  getConnectedDevices(userId: number): Promise<ConnectedDevice[]>;
  getConnectedDevice(userId: number, provider: string): Promise<ConnectedDevice | undefined>;
  createConnectedDevice(data: InsertConnectedDevice): Promise<ConnectedDevice>;
  updateConnectedDevice(id: number, data: Partial<InsertConnectedDevice>): Promise<ConnectedDevice | undefined>;
  deleteConnectedDevice(id: number): Promise<void>;

  // Training Plans
  getTrainingPlans(userId: number): Promise<TrainingPlan[]>;
  getTrainingPlan(id: number): Promise<TrainingPlan | undefined>;
  getActiveTrainingPlan(userId: number): Promise<TrainingPlan | undefined>;
  createTrainingPlan(data: InsertTrainingPlan): Promise<TrainingPlan>;
  updateTrainingPlan(id: number, data: Partial<InsertTrainingPlan>): Promise<TrainingPlan | undefined>;
  deleteTrainingPlan(id: number): Promise<void>;

  // Planned Workouts
  getPlannedWorkouts(planId: number): Promise<PlannedWorkout[]>;
  getPlannedWorkout(id: number): Promise<PlannedWorkout | undefined>;
  getPlannedWorkoutsForDateRange(planId: number, startDate: Date, endDate: Date): Promise<PlannedWorkout[]>;
  getTodaysPlannedWorkout(userId: number): Promise<PlannedWorkout | undefined>;
  createPlannedWorkout(data: InsertPlannedWorkout): Promise<PlannedWorkout>;
  updatePlannedWorkout(id: number, data: Partial<InsertPlannedWorkout>): Promise<PlannedWorkout | undefined>;
  deletePlannedWorkout(id: number): Promise<void>;

  // Workout Completions
  getWorkoutCompletion(plannedWorkoutId: number): Promise<WorkoutCompletion | undefined>;
  createWorkoutCompletion(data: InsertWorkoutCompletion): Promise<WorkoutCompletion>;
  updateWorkoutCompletion(id: number, data: Partial<InsertWorkoutCompletion>): Promise<WorkoutCompletion | undefined>;

  // Workouts
  getWorkouts(userId: number, limit?: number): Promise<Workout[]>;
  getWorkout(id: number): Promise<Workout | undefined>;
  getWorkoutsForDateRange(userId: number, startDate: Date, endDate: Date): Promise<Workout[]>;
  getRecentWorkouts(userId: number, limit: number): Promise<Workout[]>;
  createWorkout(data: InsertWorkout): Promise<Workout>;
  updateWorkout(id: number, data: Partial<InsertWorkout>): Promise<Workout | undefined>;
  deleteWorkout(id: number): Promise<void>;

  // Workout Samples
  getWorkoutSamples(workoutId: number): Promise<WorkoutSample[]>;
  createWorkoutSamples(data: InsertWorkoutSample[]): Promise<void>;

  // Workout Sessions
  getWorkoutSession(id: number): Promise<WorkoutSession | undefined>;
  getActiveWorkoutSession(userId: number): Promise<WorkoutSession | undefined>;
  createWorkoutSession(data: InsertWorkoutSession): Promise<WorkoutSession>;
  updateWorkoutSession(id: number, data: Partial<InsertWorkoutSession>): Promise<WorkoutSession | undefined>;

  // Insights
  getInsights(userId: number): Promise<Insight[]>;
  getActiveInsights(userId: number): Promise<Insight[]>;
  createInsight(data: InsertInsight): Promise<Insight>;
  updateInsight(id: number, data: Partial<InsertInsight>): Promise<Insight | undefined>;
  dismissInsight(id: number): Promise<void>;

  // Dashboard States
  getDashboardState(userId: number): Promise<DashboardState | undefined>;
  upsertDashboardState(data: InsertDashboardState): Promise<DashboardState>;

  // Aria Conversations
  getAriaConversations(userId: number): Promise<AriaConversation[]>;
  getAriaConversation(id: number): Promise<AriaConversation | undefined>;
  createAriaConversation(data: InsertAriaConversation): Promise<AriaConversation>;
  updateAriaConversation(id: number, data: Partial<InsertAriaConversation>): Promise<AriaConversation | undefined>;
  deleteAriaConversation(id: number, userId: number): Promise<void>;

  // Aria Messages
  getAriaMessages(conversationId: number): Promise<AriaMessage[]>;
  getRecentAriaMessages(conversationId: number, limit: number): Promise<AriaMessage[]>;
  createAriaMessage(data: InsertAriaMessage): Promise<AriaMessage>;

  // Races
  getRaces(userId: number): Promise<Race[]>;
  getUpcomingRaces(userId: number): Promise<Race[]>;
  getRace(id: number): Promise<Race | undefined>;
  getTodaysRace(userId: number): Promise<Race | undefined>;
  createRace(data: InsertRace): Promise<Race>;
  updateRace(id: number, data: Partial<InsertRace>): Promise<Race | undefined>;
  deleteRace(id: number): Promise<void>;

  // Analytics helpers
  getWeeklyStats(userId: number, weekStart: Date): Promise<{
    totalDistance: number;
    totalDuration: number;
    workoutCount: number;
    avgPace: string | null;
  }>;
}

export class DatabaseStorage implements IStorage {
  // ==================== USERS ====================

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async getUserByAppleId(appleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.appleId, appleId));
    return user;
  }

  async createUser(data: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      ...data,
      email: data.email.toLowerCase(),
    }).returning();
    return user;
  }

  async updateUser(id: number, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  }

  async updateUserRefreshToken(id: number, token: string | null, expiresAt: Date | null): Promise<void> {
    await db.update(users).set({
      refreshToken: token,
      refreshTokenExpiresAt: expiresAt,
    }).where(eq(users.id, id));
  }

  // ==================== USER PROFILES ====================

  async getUserProfile(userId: number): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile;
  }

  async createUserProfile(data: InsertUserProfile): Promise<UserProfile> {
    const [profile] = await db.insert(userProfiles).values(data).returning();
    return profile;
  }

  async updateUserProfile(userId: number, data: Partial<InsertUserProfile>): Promise<UserProfile | undefined> {
    const [profile] = await db.update(userProfiles)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId))
      .returning();
    return profile;
  }

  // ==================== USER PREFERENCES ====================

  async getUserPreferences(userId: number): Promise<UserPreferences | undefined> {
    const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
    return prefs;
  }

  async createUserPreferences(data: InsertUserPreferences): Promise<UserPreferences> {
    const [prefs] = await db.insert(userPreferences).values(data).returning();
    return prefs;
  }

  async updateUserPreferences(userId: number, data: Partial<InsertUserPreferences>): Promise<UserPreferences | undefined> {
    const [prefs] = await db.update(userPreferences)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(userPreferences.userId, userId))
      .returning();
    return prefs;
  }

  // ==================== CONNECTED DEVICES ====================

  async getConnectedDevices(userId: number): Promise<ConnectedDevice[]> {
    return db.select().from(connectedDevices)
      .where(and(eq(connectedDevices.userId, userId), eq(connectedDevices.isActive, true)));
  }

  async getConnectedDevice(userId: number, provider: string): Promise<ConnectedDevice | undefined> {
    const [device] = await db.select().from(connectedDevices)
      .where(and(
        eq(connectedDevices.userId, userId),
        eq(connectedDevices.provider, provider),
        eq(connectedDevices.isActive, true)
      ));
    return device;
  }

  async createConnectedDevice(data: InsertConnectedDevice): Promise<ConnectedDevice> {
    const [device] = await db.insert(connectedDevices).values(data).returning();
    return device;
  }

  async updateConnectedDevice(id: number, data: Partial<InsertConnectedDevice>): Promise<ConnectedDevice | undefined> {
    const [device] = await db.update(connectedDevices)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(connectedDevices.id, id))
      .returning();
    return device;
  }

  async deleteConnectedDevice(id: number): Promise<void> {
    await db.update(connectedDevices)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(connectedDevices.id, id));
  }

  // ==================== TRAINING PLANS ====================

  async getTrainingPlans(userId: number): Promise<TrainingPlan[]> {
    return db.select().from(trainingPlans)
      .where(eq(trainingPlans.userId, userId))
      .orderBy(desc(trainingPlans.createdAt));
  }

  async getTrainingPlan(id: number): Promise<TrainingPlan | undefined> {
    const [plan] = await db.select().from(trainingPlans).where(eq(trainingPlans.id, id));
    return plan;
  }

  async getActiveTrainingPlan(userId: number): Promise<TrainingPlan | undefined> {
    const [plan] = await db.select().from(trainingPlans)
      .where(and(eq(trainingPlans.userId, userId), eq(trainingPlans.status, 'active')))
      .orderBy(desc(trainingPlans.createdAt))
      .limit(1);
    return plan;
  }

  async createTrainingPlan(data: InsertTrainingPlan): Promise<TrainingPlan> {
    const [plan] = await db.insert(trainingPlans).values(data).returning();
    return plan;
  }

  async updateTrainingPlan(id: number, data: Partial<InsertTrainingPlan>): Promise<TrainingPlan | undefined> {
    const [plan] = await db.update(trainingPlans)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(trainingPlans.id, id))
      .returning();
    return plan;
  }

  async deleteTrainingPlan(id: number): Promise<void> {
    await db.delete(trainingPlans).where(eq(trainingPlans.id, id));
  }

  // ==================== PLANNED WORKOUTS ====================

  async getPlannedWorkouts(planId: number): Promise<PlannedWorkout[]> {
    return db.select().from(plannedWorkouts)
      .where(eq(plannedWorkouts.planId, planId))
      .orderBy(asc(plannedWorkouts.date));
  }

  async getPlannedWorkout(id: number): Promise<PlannedWorkout | undefined> {
    const [workout] = await db.select().from(plannedWorkouts).where(eq(plannedWorkouts.id, id));
    return workout;
  }

  async getPlannedWorkoutsForDateRange(planId: number, startDate: Date, endDate: Date): Promise<PlannedWorkout[]> {
    return db.select().from(plannedWorkouts)
      .where(and(
        eq(plannedWorkouts.planId, planId),
        gte(plannedWorkouts.date, startDate),
        lte(plannedWorkouts.date, endDate)
      ))
      .orderBy(asc(plannedWorkouts.date));
  }

  async getTodaysPlannedWorkout(userId: number): Promise<PlannedWorkout | undefined> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const activePlan = await this.getActiveTrainingPlan(userId);
    if (!activePlan) return undefined;

    const [workout] = await db.select().from(plannedWorkouts)
      .where(and(
        eq(plannedWorkouts.planId, activePlan.id),
        gte(plannedWorkouts.date, today),
        lte(plannedWorkouts.date, tomorrow)
      ))
      .limit(1);
    return workout;
  }

  async createPlannedWorkout(data: InsertPlannedWorkout): Promise<PlannedWorkout> {
    const [workout] = await db.insert(plannedWorkouts).values(data).returning();
    return workout;
  }

  async updatePlannedWorkout(id: number, data: Partial<InsertPlannedWorkout>): Promise<PlannedWorkout | undefined> {
    const [workout] = await db.update(plannedWorkouts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(plannedWorkouts.id, id))
      .returning();
    return workout;
  }

  async deletePlannedWorkout(id: number): Promise<void> {
    await db.delete(plannedWorkouts).where(eq(plannedWorkouts.id, id));
  }

  // ==================== WORKOUT COMPLETIONS ====================

  async getWorkoutCompletion(plannedWorkoutId: number): Promise<WorkoutCompletion | undefined> {
    const [completion] = await db.select().from(workoutCompletions)
      .where(eq(workoutCompletions.plannedWorkoutId, plannedWorkoutId));
    return completion;
  }

  async createWorkoutCompletion(data: InsertWorkoutCompletion): Promise<WorkoutCompletion> {
    const [completion] = await db.insert(workoutCompletions).values(data).returning();
    return completion;
  }

  async updateWorkoutCompletion(id: number, data: Partial<InsertWorkoutCompletion>): Promise<WorkoutCompletion | undefined> {
    const [completion] = await db.update(workoutCompletions)
      .set(data)
      .where(eq(workoutCompletions.id, id))
      .returning();
    return completion;
  }

  // ==================== WORKOUTS ====================

  async getWorkouts(userId: number, limit: number = 50): Promise<Workout[]> {
    return db.select().from(workouts)
      .where(eq(workouts.userId, userId))
      .orderBy(desc(workouts.startTime))
      .limit(limit);
  }

  async getWorkout(id: number): Promise<Workout | undefined> {
    const [workout] = await db.select().from(workouts).where(eq(workouts.id, id));
    return workout;
  }

  async getWorkoutsForDateRange(userId: number, startDate: Date, endDate: Date): Promise<Workout[]> {
    return db.select().from(workouts)
      .where(and(
        eq(workouts.userId, userId),
        gte(workouts.startTime, startDate),
        lte(workouts.startTime, endDate)
      ))
      .orderBy(desc(workouts.startTime));
  }

  async getRecentWorkouts(userId: number, limit: number): Promise<Workout[]> {
    return db.select().from(workouts)
      .where(eq(workouts.userId, userId))
      .orderBy(desc(workouts.startTime))
      .limit(limit);
  }

  async createWorkout(data: InsertWorkout): Promise<Workout> {
    const [workout] = await db.insert(workouts).values(data).returning();
    return workout;
  }

  async updateWorkout(id: number, data: Partial<InsertWorkout>): Promise<Workout | undefined> {
    const [workout] = await db.update(workouts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(workouts.id, id))
      .returning();
    return workout;
  }

  async deleteWorkout(id: number): Promise<void> {
    await db.delete(workouts).where(eq(workouts.id, id));
  }

  // ==================== WORKOUT SAMPLES ====================

  async getWorkoutSamples(workoutId: number): Promise<WorkoutSample[]> {
    return db.select().from(workoutSamples)
      .where(eq(workoutSamples.workoutId, workoutId))
      .orderBy(asc(workoutSamples.timestamp));
  }

  async createWorkoutSamples(data: InsertWorkoutSample[]): Promise<void> {
    if (data.length > 0) {
      await db.insert(workoutSamples).values(data);
    }
  }

  // ==================== WORKOUT SESSIONS ====================

  async getWorkoutSession(id: number): Promise<WorkoutSession | undefined> {
    const [session] = await db.select().from(workoutSessions).where(eq(workoutSessions.id, id));
    return session;
  }

  async getActiveWorkoutSession(userId: number): Promise<WorkoutSession | undefined> {
    const [session] = await db.select().from(workoutSessions)
      .where(and(
        eq(workoutSessions.userId, userId),
        sql`${workoutSessions.status} IN ('pending', 'warmup', 'active', 'paused', 'cooldown')`
      ))
      .orderBy(desc(workoutSessions.createdAt))
      .limit(1);
    return session;
  }

  async createWorkoutSession(data: InsertWorkoutSession): Promise<WorkoutSession> {
    const [session] = await db.insert(workoutSessions).values(data).returning();
    return session;
  }

  async updateWorkoutSession(id: number, data: Partial<InsertWorkoutSession>): Promise<WorkoutSession | undefined> {
    const [session] = await db.update(workoutSessions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(workoutSessions.id, id))
      .returning();
    return session;
  }

  // ==================== INSIGHTS ====================

  async getInsights(userId: number): Promise<Insight[]> {
    return db.select().from(insights)
      .where(eq(insights.userId, userId))
      .orderBy(desc(insights.createdAt));
  }

  async getActiveInsights(userId: number): Promise<Insight[]> {
    const now = new Date();
    return db.select().from(insights)
      .where(and(
        eq(insights.userId, userId),
        eq(insights.isDismissed, false),
        sql`(${insights.expiresAt} IS NULL OR ${insights.expiresAt} > ${now})`
      ))
      .orderBy(desc(insights.createdAt));
  }

  async createInsight(data: InsertInsight): Promise<Insight> {
    const [insight] = await db.insert(insights).values(data).returning();
    return insight;
  }

  async updateInsight(id: number, data: Partial<InsertInsight>): Promise<Insight | undefined> {
    const [insight] = await db.update(insights)
      .set(data)
      .where(eq(insights.id, id))
      .returning();
    return insight;
  }

  async dismissInsight(id: number): Promise<void> {
    await db.update(insights).set({ isDismissed: true }).where(eq(insights.id, id));
  }

  // ==================== DASHBOARD STATES ====================

  async getDashboardState(userId: number): Promise<DashboardState | undefined> {
    const [state] = await db.select().from(dashboardStates).where(eq(dashboardStates.userId, userId));
    return state;
  }

  async upsertDashboardState(data: InsertDashboardState): Promise<DashboardState> {
    const existing = await this.getDashboardState(data.userId);
    if (existing) {
      const [state] = await db.update(dashboardStates)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(dashboardStates.userId, data.userId))
        .returning();
      return state;
    } else {
      const [state] = await db.insert(dashboardStates).values(data).returning();
      return state;
    }
  }

  // ==================== ARIA CONVERSATIONS ====================

  async getAriaConversations(userId: number): Promise<AriaConversation[]> {
    return db.select().from(ariaConversations)
      .where(and(eq(ariaConversations.userId, userId), eq(ariaConversations.isArchived, false)))
      .orderBy(desc(ariaConversations.updatedAt));
  }

  async getAriaConversation(id: number): Promise<AriaConversation | undefined> {
    const [conv] = await db.select().from(ariaConversations).where(eq(ariaConversations.id, id));
    return conv;
  }

  async createAriaConversation(data: InsertAriaConversation): Promise<AriaConversation> {
    const [conv] = await db.insert(ariaConversations).values(data).returning();
    return conv;
  }

  async updateAriaConversation(id: number, data: Partial<InsertAriaConversation>): Promise<AriaConversation | undefined> {
    const [conv] = await db.update(ariaConversations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(ariaConversations.id, id))
      .returning();
    return conv;
  }

  async deleteAriaConversation(id: number, userId: number): Promise<void> {
    await db.update(ariaConversations)
      .set({ isArchived: true })
      .where(and(eq(ariaConversations.id, id), eq(ariaConversations.userId, userId)));
  }

  // ==================== ARIA MESSAGES ====================

  async getAriaMessages(conversationId: number): Promise<AriaMessage[]> {
    return db.select().from(ariaMessages)
      .where(eq(ariaMessages.conversationId, conversationId))
      .orderBy(asc(ariaMessages.createdAt));
  }

  async getRecentAriaMessages(conversationId: number, limit: number): Promise<AriaMessage[]> {
    return db.select().from(ariaMessages)
      .where(eq(ariaMessages.conversationId, conversationId))
      .orderBy(desc(ariaMessages.createdAt))
      .limit(limit);
  }

  async createAriaMessage(data: InsertAriaMessage): Promise<AriaMessage> {
    const [message] = await db.insert(ariaMessages).values(data).returning();

    // Update conversation's updatedAt
    await db.update(ariaConversations)
      .set({ updatedAt: new Date() })
      .where(eq(ariaConversations.id, data.conversationId));

    return message;
  }

  // ==================== RACES ====================

  async getRaces(userId: number): Promise<Race[]> {
    return db.select().from(races)
      .where(eq(races.userId, userId))
      .orderBy(asc(races.date));
  }

  async getUpcomingRaces(userId: number): Promise<Race[]> {
    const now = new Date();
    return db.select().from(races)
      .where(and(
        eq(races.userId, userId),
        gte(races.date, now),
        eq(races.isCompleted, false)
      ))
      .orderBy(asc(races.date));
  }

  async getRace(id: number): Promise<Race | undefined> {
    const [race] = await db.select().from(races).where(eq(races.id, id));
    return race;
  }

  async getTodaysRace(userId: number): Promise<Race | undefined> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [race] = await db.select().from(races)
      .where(and(
        eq(races.userId, userId),
        gte(races.date, today),
        lte(races.date, tomorrow),
        eq(races.isCompleted, false)
      ))
      .limit(1);
    return race;
  }

  async createRace(data: InsertRace): Promise<Race> {
    const [race] = await db.insert(races).values(data).returning();
    return race;
  }

  async updateRace(id: number, data: Partial<InsertRace>): Promise<Race | undefined> {
    const [race] = await db.update(races)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(races.id, id))
      .returning();
    return race;
  }

  async deleteRace(id: number): Promise<void> {
    await db.delete(races).where(eq(races.id, id));
  }

  // ==================== ANALYTICS ====================

  async getWeeklyStats(userId: number, weekStart: Date): Promise<{
    totalDistance: number;
    totalDuration: number;
    workoutCount: number;
    avgPace: string | null;
  }> {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const weekWorkouts = await this.getWorkoutsForDateRange(userId, weekStart, weekEnd);

    const totalDistance = weekWorkouts.reduce((sum, w) => sum + (w.distanceMeters || 0), 0);
    const totalDuration = weekWorkouts.reduce((sum, w) => sum + (w.durationSeconds || 0), 0);

    let avgPace: string | null = null;
    if (totalDistance > 0 && totalDuration > 0) {
      const paceSecsPerKm = totalDuration / (totalDistance / 1000);
      const mins = Math.floor(paceSecsPerKm / 60);
      const secs = Math.floor(paceSecsPerKm % 60);
      avgPace = `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    return {
      totalDistance,
      totalDuration,
      workoutCount: weekWorkouts.length,
      avgPace,
    };
  }
}

export const storage = new DatabaseStorage();
