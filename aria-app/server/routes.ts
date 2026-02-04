import { Express, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from './storage';
import {
  authMiddleware,
  AuthenticatedRequest,
  register,
  login,
  appleSignIn,
  logout,
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
} from './auth';
import {
  handleChat,
  generateTrainingPlan,
  determineDashboardMode,
  generateDashboardContent,
  PlanGenerationInput,
} from './aria-ai';

// ==================== VALIDATION SCHEMAS ====================

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const appleSignInSchema = z.object({
  identityToken: z.string(),
  authorizationCode: z.string(),
  user: z.object({
    email: z.string().email().optional(),
    name: z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
    }).optional(),
  }).optional(),
});

const updateProfileSchema = z.object({
  displayName: z.string().optional(),
  sport: z.string().optional(),
  experienceLevel: z.string().optional(),
  goalTags: z.array(z.string()).optional(),
  units: z.enum(['imperial', 'metric']).optional(),
  dateOfBirth: z.string().datetime().optional(),
  gender: z.string().optional(),
  height: z.number().optional(),
  weight: z.number().optional(),
  weeklyGoalDistance: z.number().optional(),
  weeklyGoalDuration: z.number().optional(),
});

const updatePreferencesSchema = z.object({
  notificationPrefs: z.object({
    workoutReminders: z.boolean().optional(),
    dailyDigest: z.boolean().optional(),
    weeklyReport: z.boolean().optional(),
    coachingTips: z.boolean().optional(),
    competitionAlerts: z.boolean().optional(),
  }).optional(),
  privacyPrefs: z.object({
    shareWorkouts: z.boolean().optional(),
    publicProfile: z.boolean().optional(),
    dataAnalytics: z.boolean().optional(),
  }).optional(),
  aiCoachingStyle: z.enum(['motivational', 'technical', 'balanced', 'minimal']).optional(),
  preferredWorkoutDays: z.array(z.string()).optional(),
  preferredWorkoutTime: z.enum(['morning', 'afternoon', 'evening']).optional(),
});

const createPlanSchema = z.object({
  planName: z.string(),
  description: z.string().optional(),
  targetEventName: z.string().optional(),
  targetEventDate: z.string().datetime().optional(),
  targetDistance: z.number().optional(),
  targetTime: z.number().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  weekCount: z.number().optional(),
});

const createPlannedWorkoutSchema = z.object({
  date: z.string().datetime(),
  weekNumber: z.number().optional(),
  dayOfWeek: z.number().min(0).max(6).optional(),
  type: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  structure: z.any().optional(),
  targetDuration: z.number().optional(),
  targetDistance: z.number().optional(),
  targetPace: z.string().optional(),
  notes: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'key']).optional(),
});

const createWorkoutSchema = z.object({
  type: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  timezone: z.string().optional(),
  durationSeconds: z.number().optional(),
  distanceMeters: z.number().optional(),
  elevationGainMeters: z.number().optional(),
  avgPace: z.string().optional(),
  avgSpeed: z.number().optional(),
  maxSpeed: z.number().optional(),
  avgHeartRate: z.number().optional(),
  maxHeartRate: z.number().optional(),
  avgCadence: z.number().optional(),
  calories: z.number().optional(),
  splits: z.array(z.any()).optional(),
  notes: z.string().optional(),
});

const completeWorkoutSchema = z.object({
  status: z.enum(['completed', 'partial', 'skipped']),
  actualWorkoutId: z.number().optional(),
  complianceScore: z.number().optional(),
  reasonSkipped: z.string().optional(),
  feedback: z.string().optional(),
  perceivedEffort: z.number().min(1).max(10).optional(),
  mood: z.enum(['great', 'good', 'okay', 'tired', 'exhausted']).optional(),
});

const startSessionSchema = z.object({
  plannedWorkoutId: z.number().optional(),
});

const updateSessionSchema = z.object({
  status: z.enum(['warmup', 'active', 'paused', 'cooldown', 'completed', 'cancelled']).optional(),
  currentPhase: z.string().optional(),
  currentIntervalIndex: z.number().optional(),
  liveMetrics: z.any().optional(),
});

const checkpointSchema = z.object({
  distance: z.number(),
  duration: z.number(),
  heartRate: z.number().optional(),
  pace: z.string().optional(),
});

const finishSessionSchema = z.object({
  workoutData: z.any().optional(),
});

const chatSchema = z.object({
  message: z.string(),
  conversationId: z.number().optional(),
});

const generatePlanSchema = z.object({
  targetEvent: z.string().optional(),
  targetDate: z.string().datetime().optional(),
  currentFitnessLevel: z.enum(['beginner', 'intermediate', 'advanced', 'elite']),
  daysPerWeek: z.number().min(1).max(7),
  longRunDay: z.string().optional(),
  includeSpeedwork: z.boolean().optional(),
  includeStrength: z.boolean().optional(),
  notes: z.string().optional(),
});

const createRaceSchema = z.object({
  name: z.string(),
  distance: z.number().optional(),
  distanceLabel: z.string().optional(),
  date: z.string().datetime(),
  location: z.string().optional(),
  goalTime: z.number().optional(),
  notes: z.string().optional(),
});

const updateRaceSchema = z.object({
  name: z.string().optional(),
  distance: z.number().optional(),
  distanceLabel: z.string().optional(),
  date: z.string().datetime().optional(),
  location: z.string().optional(),
  goalTime: z.number().optional(),
  notes: z.string().optional(),
  isCompleted: z.boolean().optional(),
  finishTime: z.number().optional(),
  finishPlace: z.number().optional(),
  ageGroupPlace: z.number().optional(),
});

// ==================== ROUTE REGISTRATION ====================

export function registerRoutes(app: Express): void {
  // ==================== AUTH ROUTES ====================

  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const data = registerSchema.parse(req.body);
      const result = await register(data);
      res.status(201).json(result);
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Invalid input', details: error.errors });
      } else {
        res.status(400).json({ error: error.message || 'Registration failed' });
      }
    }
  });

  app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const data = loginSchema.parse(req.body);
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      const result = await login(data, clientIp);
      res.json(result);
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Invalid input', details: error.errors });
      } else {
        res.status(401).json({ error: error.message || 'Login failed' });
      }
    }
  });

  app.post('/api/auth/apple', async (req: Request, res: Response) => {
    try {
      const data = appleSignInSchema.parse(req.body);
      const result = await appleSignIn(data);
      res.json(result);
    } catch (error: any) {
      console.error('Apple Sign In error:', error);
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Invalid input', details: error.errors });
      } else {
        res.status(401).json({ error: error.message || 'Apple Sign In failed' });
      }
    }
  });

  app.post('/api/auth/refresh', async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token required' });
      }
      // Note: Full implementation would look up user by refresh token
      res.status(501).json({ error: 'Refresh token endpoint not fully implemented' });
    } catch (error: any) {
      console.error('Token refresh error:', error);
      res.status(401).json({ error: 'Token refresh failed' });
    }
  });

  app.post('/api/auth/logout', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      await logout(req.userId!);
      res.json({ message: 'Logged out successfully' });
    } catch (error: any) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  });

  // ==================== USER ROUTES ====================

  app.get('/api/user', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const [profile, preferences] = await Promise.all([
        storage.getUserProfile(req.userId!),
        storage.getUserPreferences(req.userId!),
      ]);
      res.json({
        user: req.user,
        profile,
        preferences,
      });
    } catch (error: any) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Failed to fetch user data' });
    }
  });

  app.patch('/api/user', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const profileData = updateProfileSchema.parse(req.body.profile || {});
      const preferencesData = updatePreferencesSchema.parse(req.body.preferences || {});

      const [profile, preferences] = await Promise.all([
        Object.keys(profileData).length > 0
          ? storage.updateUserProfile(req.userId!, profileData as any)
          : storage.getUserProfile(req.userId!),
        Object.keys(preferencesData).length > 0
          ? storage.updateUserPreferences(req.userId!, preferencesData as any)
          : storage.getUserPreferences(req.userId!),
      ]);

      res.json({ profile, preferences });
    } catch (error: any) {
      console.error('Update user error:', error);
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Invalid input', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to update user data' });
      }
    }
  });

  app.post('/api/user/complete-onboarding', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const profile = await storage.updateUserProfile(req.userId!, {
        onboardingCompleted: true,
      });
      res.json({ profile });
    } catch (error: any) {
      console.error('Complete onboarding error:', error);
      res.status(500).json({ error: 'Failed to complete onboarding' });
    }
  });

  // ==================== TRAINING PLAN ROUTES ====================

  app.get('/api/plans', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const plans = await storage.getTrainingPlans(req.userId!);
      res.json(plans);
    } catch (error: any) {
      console.error('Get plans error:', error);
      res.status(500).json({ error: 'Failed to fetch training plans' });
    }
  });

  app.post('/api/plans', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = createPlanSchema.parse(req.body);
      const plan = await storage.createTrainingPlan({
        userId: req.userId!,
        ...data,
        targetEventDate: data.targetEventDate ? new Date(data.targetEventDate) : undefined,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      });
      res.status(201).json(plan);
    } catch (error: any) {
      console.error('Create plan error:', error);
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Invalid input', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to create training plan' });
      }
    }
  });

  app.get('/api/plans/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const planId = parseInt(req.params.id);
      const plan = await storage.getTrainingPlan(planId);
      if (!plan || plan.userId !== req.userId) {
        return res.status(404).json({ error: 'Plan not found' });
      }
      res.json(plan);
    } catch (error: any) {
      console.error('Get plan error:', error);
      res.status(500).json({ error: 'Failed to fetch training plan' });
    }
  });

  app.patch('/api/plans/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const planId = parseInt(req.params.id);
      const existingPlan = await storage.getTrainingPlan(planId);
      if (!existingPlan || existingPlan.userId !== req.userId) {
        return res.status(404).json({ error: 'Plan not found' });
      }

      const data = createPlanSchema.partial().parse(req.body);
      const plan = await storage.updateTrainingPlan(planId, {
        ...data,
        targetEventDate: data.targetEventDate ? new Date(data.targetEventDate) : undefined,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      });
      res.json(plan);
    } catch (error: any) {
      console.error('Update plan error:', error);
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Invalid input', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to update training plan' });
      }
    }
  });

  app.delete('/api/plans/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const planId = parseInt(req.params.id);
      const existingPlan = await storage.getTrainingPlan(planId);
      if (!existingPlan || existingPlan.userId !== req.userId) {
        return res.status(404).json({ error: 'Plan not found' });
      }

      await storage.deleteTrainingPlan(planId);
      res.json({ message: 'Plan deleted successfully' });
    } catch (error: any) {
      console.error('Delete plan error:', error);
      res.status(500).json({ error: 'Failed to delete training plan' });
    }
  });

  app.get('/api/plans/:id/workouts', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const planId = parseInt(req.params.id);
      const existingPlan = await storage.getTrainingPlan(planId);
      if (!existingPlan || existingPlan.userId !== req.userId) {
        return res.status(404).json({ error: 'Plan not found' });
      }

      const workouts = await storage.getPlannedWorkouts(planId);
      res.json(workouts);
    } catch (error: any) {
      console.error('Get planned workouts error:', error);
      res.status(500).json({ error: 'Failed to fetch planned workouts' });
    }
  });

  app.post('/api/plans/:id/workouts', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const planId = parseInt(req.params.id);
      const existingPlan = await storage.getTrainingPlan(planId);
      if (!existingPlan || existingPlan.userId !== req.userId) {
        return res.status(404).json({ error: 'Plan not found' });
      }

      const data = createPlannedWorkoutSchema.parse(req.body);
      const workout = await storage.createPlannedWorkout({
        planId,
        ...data,
        date: new Date(data.date),
      });
      res.status(201).json(workout);
    } catch (error: any) {
      console.error('Create planned workout error:', error);
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Invalid input', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to create planned workout' });
      }
    }
  });

  // ==================== WORKOUT ROUTES ====================

  app.get('/api/workouts', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const workouts = await storage.getWorkouts(req.userId!, limit);
      res.json(workouts);
    } catch (error: any) {
      console.error('Get workouts error:', error);
      res.status(500).json({ error: 'Failed to fetch workouts' });
    }
  });

  app.post('/api/workouts', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = createWorkoutSchema.parse(req.body);
      const workout = await storage.createWorkout({
        userId: req.userId!,
        ...data,
        providerSource: 'manual',
        startTime: new Date(data.startTime),
        endTime: data.endTime ? new Date(data.endTime) : undefined,
      });
      res.status(201).json(workout);
    } catch (error: any) {
      console.error('Create workout error:', error);
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Invalid input', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to create workout' });
      }
    }
  });

  app.get('/api/workouts/today', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const workout = await storage.getTodaysPlannedWorkout(req.userId!);
      if (!workout) {
        return res.status(404).json({ error: 'No workout planned for today' });
      }
      res.json(workout);
    } catch (error: any) {
      console.error('Get today workout error:', error);
      res.status(500).json({ error: 'Failed to fetch today\'s workout' });
    }
  });

  app.get('/api/workouts/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const workoutId = parseInt(req.params.id);
      const workout = await storage.getWorkout(workoutId);
      if (!workout || workout.userId !== req.userId) {
        return res.status(404).json({ error: 'Workout not found' });
      }
      res.json(workout);
    } catch (error: any) {
      console.error('Get workout error:', error);
      res.status(500).json({ error: 'Failed to fetch workout' });
    }
  });

  app.post('/api/workouts/:id/complete', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const plannedWorkoutId = parseInt(req.params.id);
      const data = completeWorkoutSchema.parse(req.body);

      // Verify the planned workout belongs to user's plan
      const plannedWorkout = await storage.getPlannedWorkout(plannedWorkoutId);
      if (!plannedWorkout) {
        return res.status(404).json({ error: 'Planned workout not found' });
      }

      const plan = await storage.getTrainingPlan(plannedWorkout.planId);
      if (!plan || plan.userId !== req.userId) {
        return res.status(404).json({ error: 'Planned workout not found' });
      }

      const completion = await storage.createWorkoutCompletion({
        plannedWorkoutId,
        ...data,
        completedAt: new Date(),
      });

      res.status(201).json(completion);
    } catch (error: any) {
      console.error('Complete workout error:', error);
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Invalid input', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to complete workout' });
      }
    }
  });

  app.post('/api/workouts/:id/skip', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const plannedWorkoutId = parseInt(req.params.id);
      const { reason } = req.body;

      // Verify the planned workout belongs to user's plan
      const plannedWorkout = await storage.getPlannedWorkout(plannedWorkoutId);
      if (!plannedWorkout) {
        return res.status(404).json({ error: 'Planned workout not found' });
      }

      const plan = await storage.getTrainingPlan(plannedWorkout.planId);
      if (!plan || plan.userId !== req.userId) {
        return res.status(404).json({ error: 'Planned workout not found' });
      }

      const completion = await storage.createWorkoutCompletion({
        plannedWorkoutId,
        status: 'skipped',
        reasonSkipped: reason,
        completedAt: new Date(),
      });

      res.status(201).json(completion);
    } catch (error: any) {
      console.error('Skip workout error:', error);
      res.status(500).json({ error: 'Failed to skip workout' });
    }
  });

  // ==================== SESSION ROUTES ====================

  app.post('/api/sessions/start', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = startSessionSchema.parse(req.body);

      // Check for existing active session
      const existingSession = await storage.getActiveWorkoutSession(req.userId!);
      if (existingSession) {
        return res.status(409).json({
          error: 'Active session exists',
          session: existingSession,
        });
      }

      const session = await storage.createWorkoutSession({
        userId: req.userId!,
        plannedWorkoutId: data.plannedWorkoutId,
        status: 'pending',
        startedAt: new Date(),
      });

      res.status(201).json(session);
    } catch (error: any) {
      console.error('Start session error:', error);
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Invalid input', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to start session' });
      }
    }
  });

  app.patch('/api/sessions/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const sessionId = parseInt(req.params.id);
      const existingSession = await storage.getWorkoutSession(sessionId);
      if (!existingSession || existingSession.userId !== req.userId) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const data = updateSessionSchema.parse(req.body);

      // Handle pause/resume timing
      let updateData: any = { ...data };
      if (data.status === 'paused' && existingSession.status !== 'paused') {
        updateData.pausedAt = new Date();
      } else if (data.status !== 'paused' && existingSession.status === 'paused' && existingSession.pausedAt) {
        const pauseDuration = Date.now() - new Date(existingSession.pausedAt).getTime();
        updateData.totalPausedDuration = (existingSession.totalPausedDuration || 0) + Math.round(pauseDuration / 1000);
        updateData.pausedAt = null;
      }

      const session = await storage.updateWorkoutSession(sessionId, updateData);
      res.json(session);
    } catch (error: any) {
      console.error('Update session error:', error);
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Invalid input', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to update session' });
      }
    }
  });

  app.post('/api/sessions/:id/checkpoint', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const sessionId = parseInt(req.params.id);
      const existingSession = await storage.getWorkoutSession(sessionId);
      if (!existingSession || existingSession.userId !== req.userId) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const data = checkpointSchema.parse(req.body);
      const checkpoints = existingSession.checkpoints || [];
      checkpoints.push({
        timestamp: new Date().toISOString(),
        ...data,
      });

      const session = await storage.updateWorkoutSession(sessionId, { checkpoints });
      res.json(session);
    } catch (error: any) {
      console.error('Add checkpoint error:', error);
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Invalid input', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to add checkpoint' });
      }
    }
  });

  app.post('/api/sessions/:id/finish', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const sessionId = parseInt(req.params.id);
      const existingSession = await storage.getWorkoutSession(sessionId);
      if (!existingSession || existingSession.userId !== req.userId) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const data = finishSessionSchema.parse(req.body);

      // Create the actual workout record
      let finalWorkoutId: number | undefined;
      if (data.workoutData) {
        const workout = await storage.createWorkout({
          userId: req.userId!,
          providerSource: 'manual',
          ...data.workoutData,
          startTime: existingSession.startedAt || new Date(),
        });
        finalWorkoutId = workout.id;
      }

      const session = await storage.updateWorkoutSession(sessionId, {
        status: 'completed',
        completedAt: new Date(),
        finalWorkoutId,
      });

      res.json(session);
    } catch (error: any) {
      console.error('Finish session error:', error);
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Invalid input', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to finish session' });
      }
    }
  });

  // ==================== ANALYTICS ROUTES ====================

  app.get('/api/analytics/weekly', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const stats = await storage.getWeeklyStats(req.userId!, weekStart);
      res.json(stats);
    } catch (error: any) {
      console.error('Get weekly analytics error:', error);
      res.status(500).json({ error: 'Failed to fetch weekly analytics' });
    }
  });

  app.get('/api/analytics/trends', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const weeks = parseInt(req.query.weeks as string) || 4;
      const trends: any[] = [];

      for (let i = 0; i < weeks; i++) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() - (i * 7));
        weekStart.setHours(0, 0, 0, 0);

        const stats = await storage.getWeeklyStats(req.userId!, weekStart);
        trends.unshift({
          weekStart: weekStart.toISOString(),
          ...stats,
        });
      }

      res.json(trends);
    } catch (error: any) {
      console.error('Get trends error:', error);
      res.status(500).json({ error: 'Failed to fetch trends' });
    }
  });

  // ==================== INSIGHTS ROUTES ====================

  app.get('/api/insights', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const insights = await storage.getActiveInsights(req.userId!);
      res.json(insights);
    } catch (error: any) {
      console.error('Get insights error:', error);
      res.status(500).json({ error: 'Failed to fetch insights' });
    }
  });

  app.post('/api/insights/:id/dismiss', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const insightId = parseInt(req.params.id);
      await storage.dismissInsight(insightId);
      res.json({ message: 'Insight dismissed' });
    } catch (error: any) {
      console.error('Dismiss insight error:', error);
      res.status(500).json({ error: 'Failed to dismiss insight' });
    }
  });

  // ==================== DASHBOARD ROUTES ====================

  app.get('/api/dashboard/state', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { mode, context } = await determineDashboardMode(req.userId!);
      const content = await generateDashboardContent(req.userId!, mode, context);

      // Save/update dashboard state
      await storage.upsertDashboardState({
        userId: req.userId!,
        mode,
        greeting: content.greeting,
        subtitle: content.subtitle,
        cards: content.cards,
        generatedBy: 'rules',
        generatedAt: new Date(),
      });

      res.json({
        mode,
        ...content,
      });
    } catch (error: any) {
      console.error('Get dashboard state error:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard state' });
    }
  });

  // ==================== ARIA AI ROUTES ====================

  app.get('/api/aria/conversations', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const conversations = await storage.getAriaConversations(req.userId!);
      res.json(conversations);
    } catch (error: any) {
      console.error('Get conversations error:', error);
      res.status(500).json({ error: 'Failed to fetch conversations' });
    }
  });

  app.post('/api/aria/conversations', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { title } = req.body;
      const isUuidLike = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(title || '');
      const cleanTitle = (title && !isUuidLike && title.length > 0) ? title : 'New Conversation';

      const conversation = await storage.createAriaConversation({
        userId: req.userId!,
        title: cleanTitle,
      });
      res.status(201).json(conversation);
    } catch (error: any) {
      console.error('Create conversation error:', error);
      res.status(500).json({ error: 'Failed to create conversation' });
    }
  });

  app.get('/api/aria/conversations/:id/messages', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const conversation = await storage.getAriaConversation(conversationId);
      if (!conversation || conversation.userId !== req.userId) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      const messages = await storage.getAriaMessages(conversationId);
      res.json(messages);
    } catch (error: any) {
      console.error('Get messages error:', error);
      res.status(500).json({ error: 'Failed to fetch messages' });
    }
  });

  app.delete('/api/aria/conversations/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      await storage.deleteAriaConversation(conversationId, req.userId!);
      res.json({ message: 'Conversation deleted successfully' });
    } catch (error: any) {
      console.error('Delete conversation error:', error);
      res.status(500).json({ error: 'Failed to delete conversation' });
    }
  });

  app.post('/api/aria/chat', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = chatSchema.parse(req.body);
      const result = await handleChat(req.userId!, data);
      res.json(result);
    } catch (error: any) {
      console.error('Chat error:', error);
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Invalid input', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to process chat message' });
      }
    }
  });

  app.post('/api/aria/generate-plan', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = generatePlanSchema.parse(req.body);
      const planContent = await generateTrainingPlan(req.userId!, {
        ...data,
        targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
      } as PlanGenerationInput);
      res.json({ content: planContent });
    } catch (error: any) {
      console.error('Generate plan error:', error);
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Invalid input', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to generate training plan' });
      }
    }
  });

  // ==================== RACES ROUTES ====================

  app.get('/api/races', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const races = await storage.getRaces(req.userId!);
      res.json(races);
    } catch (error: any) {
      console.error('Get races error:', error);
      res.status(500).json({ error: 'Failed to fetch races' });
    }
  });

  app.post('/api/races', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = createRaceSchema.parse(req.body);
      const race = await storage.createRace({
        userId: req.userId!,
        ...data,
        date: new Date(data.date),
      });
      res.status(201).json(race);
    } catch (error: any) {
      console.error('Create race error:', error);
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Invalid input', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to create race' });
      }
    }
  });

  app.get('/api/races/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const raceId = parseInt(req.params.id);
      const race = await storage.getRace(raceId);
      if (!race || race.userId !== req.userId) {
        return res.status(404).json({ error: 'Race not found' });
      }
      res.json(race);
    } catch (error: any) {
      console.error('Get race error:', error);
      res.status(500).json({ error: 'Failed to fetch race' });
    }
  });

  app.patch('/api/races/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const raceId = parseInt(req.params.id);
      const existingRace = await storage.getRace(raceId);
      if (!existingRace || existingRace.userId !== req.userId) {
        return res.status(404).json({ error: 'Race not found' });
      }

      const data = updateRaceSchema.parse(req.body);
      const race = await storage.updateRace(raceId, {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
      });
      res.json(race);
    } catch (error: any) {
      console.error('Update race error:', error);
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Invalid input', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to update race' });
      }
    }
  });

  app.delete('/api/races/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const raceId = parseInt(req.params.id);
      const existingRace = await storage.getRace(raceId);
      if (!existingRace || existingRace.userId !== req.userId) {
        return res.status(404).json({ error: 'Race not found' });
      }

      await storage.deleteRace(raceId);
      res.json({ message: 'Race deleted successfully' });
    } catch (error: any) {
      console.error('Delete race error:', error);
      res.status(500).json({ error: 'Failed to delete race' });
    }
  });

  app.post('/api/races/:id/result', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const raceId = parseInt(req.params.id);
      const existingRace = await storage.getRace(raceId);
      if (!existingRace || existingRace.userId !== req.userId) {
        return res.status(404).json({ error: 'Race not found' });
      }

      const { finishTime, finishPlace, ageGroupPlace, workoutId } = req.body;
      const race = await storage.updateRace(raceId, {
        isCompleted: true,
        finishTime,
        finishPlace,
        ageGroupPlace,
        workoutId,
      });
      res.json(race);
    } catch (error: any) {
      console.error('Record race result error:', error);
      res.status(500).json({ error: 'Failed to record race result' });
    }
  });

  // ==================== HEALTH CHECK ====================

  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
}
