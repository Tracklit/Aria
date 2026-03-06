import { Express, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from './storage';
import {
  authMiddleware,
  AuthenticatedRequest,
  register,
  login,
  appleSignIn,
  googleSignIn,
  logout,
  refreshAccessToken,
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
} from './auth';
import {
  handleChat,
  handleChatStream,
  generateTrainingPlan,
  determineDashboardMode,
  generateDashboardContent,
  PlanGenerationInput,
  generateNutritionPlan,
  generateProgram,
  NutritionPlanInput,
  ProgramGenerationInput,
} from './aria-ai';
import { uploadFileToBlob, deleteBlob, generateBlobSasUrl } from './azure-storage';
import { parseDocument } from './document-parser';
import multer from 'multer';

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

const googleSignInSchema = z.object({
  idToken: z.string(),
});

const updateProfileSchema = z.object({
  displayName: z.string().nullable().optional(),
  sport: z.string().nullable().optional(),
  experienceLevel: z.string().nullable().optional(),
  goalTags: z.array(z.string()).optional(),
  units: z.enum(['imperial', 'metric']).optional(),
  dateOfBirth: z.coerce.date().nullable().optional(),
  gender: z.string().nullable().optional(),
  height: z.number().nullable().optional(),
  weight: z.number().nullable().optional(),
  weeklyGoalDistance: z.number().nullable().optional(),
  weeklyGoalDuration: z.number().nullable().optional(),
  country: z.string().nullable().optional(),
  activityLevel: z.string().nullable().optional(),
  bodyFatPercentage: z.number().nullable().optional(),
  dietaryRestrictions: z.array(z.string()).nullable().optional(),
  foodPreferences: z.record(z.any()).nullable().optional(),
  injuryHistory: z.string().nullable().optional(),
});

const updatePreferencesSchema = z.object({
  notificationPrefs: z.object({
    workoutReminders: z.boolean().optional(),
    dailyDigest: z.boolean().optional(),
    weeklyReport: z.boolean().optional(),
    coachingTips: z.boolean().optional(),
    competitionAlerts: z.boolean().optional(),
    missedWorkout: z.boolean().optional(),
    restDay: z.boolean().optional(),
    fatigue: z.boolean().optional(),
    prPredictions: z.boolean().optional(),
    raceReminders: z.boolean().optional(),
    mealReminders: z.boolean().optional(),
    hydration: z.boolean().optional(),
    quietHoursEnabled: z.boolean().optional(),
    quietHoursStart: z.string().optional(),
    quietHoursEnd: z.string().optional(),
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
  stream: z.boolean().optional(),
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
  preferredUnits: z.enum(['imperial', 'metric']).optional(),
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

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, JPEG, PNG, and WebP images are allowed'));
    }
  },
});

/**
 * Parse AI JSON responses. The AI may return:
 *   1. Raw JSON: { "title": "...", ... }
 *   2. Code-fenced JSON: ```json\n{...}\n```
 *   3. Envelope: { "analysis": "...", "recommendation": "{escaped JSON}" }
 *   4. Any combination of the above with preamble text
 */
function parseAIJsonResponse(aiResponse: string, label: string): any {
  console.log(`[parseAI:${label}] raw response length: ${aiResponse.length}, first 200: ${aiResponse.substring(0, 200)}`);

  // Strategy 1: Try parsing the whole thing as JSON directly
  try {
    const direct = JSON.parse(aiResponse.trim());
    console.log(`[parseAI:${label}] Strategy 1 (direct parse) succeeded, keys: ${Object.keys(direct)}`);
    return unwrapEnvelope(direct);
  } catch { /* not raw JSON */ }

  // Strategy 2: Strip code fences
  const fenceMatch = aiResponse.match(/```(?:json)?\s*\n?([\s\S]+?)\n?\s*```/);
  if (fenceMatch) {
    try {
      const parsed = JSON.parse(fenceMatch[1].trim());
      console.log(`[parseAI:${label}] Strategy 2 (code fence) succeeded, keys: ${Object.keys(parsed)}`);
      return unwrapEnvelope(parsed);
    } catch { /* fence content not valid JSON */ }
  }

  // Strategy 3: Find first { ... last } in the string
  const firstBrace = aiResponse.indexOf('{');
  const lastBrace = aiResponse.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      const parsed = JSON.parse(aiResponse.substring(firstBrace, lastBrace + 1));
      console.log(`[parseAI:${label}] Strategy 3 (brace extraction) succeeded, keys: ${Object.keys(parsed)}`);
      return unwrapEnvelope(parsed);
    } catch { /* extracted content not valid JSON */ }
  }

  console.error(`[parseAI:${label}] All strategies failed. Raw (500 chars): ${aiResponse.substring(0, 500)}`);
  return { description: aiResponse };
}

function unwrapEnvelope(parsed: any): any {
  // If it has a recommendation string, try to parse it as nested JSON
  if (parsed.recommendation && typeof parsed.recommendation === 'string') {
    try {
      const inner = JSON.parse(parsed.recommendation);
      if (typeof inner === 'object' && inner !== null) {
        return { ...parsed, ...inner };
      }
    } catch { /* not nested JSON */ }
  }
  return parsed;
}

const createNutritionPlanSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  activityLevel: z.string().optional(),
  season: z.string().optional(),
  calorieTarget: z.number().optional(),
  proteinGrams: z.number().optional(),
  carbsGrams: z.number().optional(),
  fatsGrams: z.number().optional(),
  mealSuggestions: z.any().optional(),
  createdBy: z.enum(['user', 'ai']).optional(),
});

const generateNutritionSchema = z.object({
  activityLevel: z.string().optional(),
  season: z.string().optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
  foodPreferences: z.record(z.any()).optional(),
  locality: z.string().optional(),
  calorieTarget: z.number().optional(),
  notes: z.string().optional(),
  preferredUnits: z.enum(['imperial', 'metric']).optional(),
});

const createProgramSchema2 = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  level: z.string().optional(),
  duration: z.number().optional(),
  totalSessions: z.number().optional(),
  generatedBy: z.enum(['user', 'ai']).optional(),
  isTextBased: z.boolean().optional(),
  textContent: z.string().optional(),
});

const generateProgramSchema = z.object({
  title: z.string().optional(),
  category: z.string().optional(),
  level: z.string().optional(),
  durationWeeks: z.number().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  preferredUnits: z.enum(['imperial', 'metric']).optional(),
});

const importSheetSchema = z.object({
  title: z.string().min(1),
  googleSheetUrl: z.string().url(),
  description: z.string().optional(),
});

const programSessionSchema = z.object({
  dayNumber: z.number().int().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  exercises: z.array(z.object({
    name: z.string(),
    sets: z.number().optional(),
    reps: z.string().optional(),
    duration: z.number().optional(),
    rest: z.number().optional(),
    notes: z.string().optional(),
  })).optional(),
  isRestDay: z.boolean().optional(),
});

// ==================== ROUTE REGISTRATION ====================

export function registerRoutes(app: Express): void {
  // ==================== AUTH ROUTES ====================

  app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const data = registerSchema.parse(req.body);
      const result = await register(data);
      // Map accessToken to token for mobile app compatibility
      const { accessToken, ...rest } = result;
      res.status(201).json({ ...rest, token: accessToken });
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
      // Map accessToken to token for mobile app compatibility
      const { accessToken, ...rest } = result;
      res.json({ ...rest, token: accessToken });
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
      // Map accessToken to token for mobile app compatibility
      const { accessToken, ...rest } = result;
      res.json({ ...rest, token: accessToken });
    } catch (error: any) {
      console.error('Apple Sign In error:', error);
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Invalid input', details: error.errors });
      } else {
        res.status(401).json({ error: error.message || 'Apple Sign In failed' });
      }
    }
  });

  app.post('/api/auth/google', async (req: Request, res: Response) => {
    try {
      const data = googleSignInSchema.parse(req.body);
      const result = await googleSignIn(data);
      // Map accessToken to token for mobile app compatibility
      const { accessToken, ...rest } = result;
      res.json({ ...rest, token: accessToken });
    } catch (error: any) {
      console.error('Google Sign In error:', error);
      if (error.name === 'ZodError') {
        res.status(400).json({ error: 'Invalid input', details: error.errors });
      } else {
        res.status(401).json({ error: error.message || 'Google Sign In failed' });
      }
    }
  });

  app.post('/api/auth/refresh', async (req: Request, res: Response) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token required' });
      }
      const result = await refreshAccessToken(refreshToken);
      const { accessToken, ...rest } = result;
      res.json({ ...rest, token: accessToken });
    } catch (error: any) {
      console.error('Token refresh error:', error);
      res.status(401).json({ error: error.message || 'Token refresh failed' });
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
      // Generate SAS URL for profile photo if stored as a blob URL
      if (profile?.photoUrl && profile.photoUrl.includes('.blob.core.windows.net')) {
        profile.photoUrl = await generateBlobSasUrl(profile.photoUrl);
      }
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

      // Generate SAS URL for profile photo if stored as a blob URL
      if (profile?.photoUrl && profile.photoUrl.includes('.blob.core.windows.net')) {
        profile.photoUrl = await generateBlobSasUrl(profile.photoUrl);
      }

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

  // ==================== PHOTO UPLOAD ROUTE ====================

  app.post('/api/user/public-profile', authMiddleware, upload.single('profileImage'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No image file provided' });
      }

      const { url: blobUrl } = await uploadFileToBlob(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        'profile-images',
      );

      await storage.updateUserProfile(req.userId!, { photoUrl: blobUrl });

      const sasUrl = await generateBlobSasUrl(blobUrl);
      res.json({ profileImageUrl: sasUrl, photoUrl: sasUrl, success: true });
    } catch (error: any) {
      console.error('Photo upload error:', error);
      res.status(500).json({ error: 'Failed to upload profile image' });
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
      res.json({ workout: workout || null });
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

  app.get('/api/sessions', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const sessions = await storage.getCompletedWorkoutSessions(req.userId!);
      res.json(sessions);
    } catch (error: any) {
      console.error('Get completed sessions error:', error);
      res.status(500).json({ error: 'Failed to fetch completed sessions' });
    }
  });

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

  // ==================== ADDITIONAL ANALYTICS ROUTES ====================

  app.get('/api/analytics/patterns', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const workouts = await storage.getRecentWorkouts(req.userId!, 30);
      const patterns: any[] = [];

      if (workouts.length >= 5) {
        // Check workout frequency pattern
        const daysBetween: number[] = [];
        for (let i = 1; i < workouts.length; i++) {
          const diff = (new Date(workouts[i - 1].startTime).getTime() - new Date(workouts[i].startTime).getTime()) / (1000 * 60 * 60 * 24);
          daysBetween.push(diff);
        }
        const avgGap = daysBetween.reduce((a, b) => a + b, 0) / daysBetween.length;

        if (avgGap <= 1.5) {
          patterns.push({
            type: 'overtraining',
            confidence: 0.7,
            description: 'You are training very frequently with little rest between sessions.',
            recommendation: 'Consider adding more rest days to allow recovery.',
            detectedAt: new Date().toISOString(),
            severity: 'medium',
          });
        } else if (avgGap >= 4) {
          patterns.push({
            type: 'undertraining',
            confidence: 0.6,
            description: 'Your training sessions are spread far apart.',
            recommendation: 'Try to increase your training frequency for better progress.',
            detectedAt: new Date().toISOString(),
            severity: 'low',
          });
        } else {
          patterns.push({
            type: 'consistent',
            confidence: 0.8,
            description: 'Your training frequency is consistent and well-balanced.',
            recommendation: 'Keep up the good work! Consider gradually increasing intensity.',
            detectedAt: new Date().toISOString(),
            severity: 'low',
          });
        }
      }

      res.json({ patterns });
    } catch (error: any) {
      console.error('Get patterns error:', error);
      res.status(500).json({ error: 'Failed to fetch training patterns' });
    }
  });

  app.get('/api/analytics/fatigue-score', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const recentWorkouts = await storage.getRecentWorkouts(req.userId!, 14);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const lastWeekWorkouts = recentWorkouts.filter(w => new Date(w.startTime) >= weekAgo);

      // Simple fatigue score based on recent training load
      const totalMinutes = lastWeekWorkouts.reduce((sum, w) => sum + (w.durationSeconds || 0) / 60, 0);
      const workoutCount = lastWeekWorkouts.length;

      let score = Math.min(100, Math.round((workoutCount * 12) + (totalMinutes * 0.15)));
      let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
      const factors: string[] = [];

      if (workoutCount >= 6) {
        factors.push('High workout frequency this week');
        trend = 'increasing';
      } else if (workoutCount <= 2) {
        factors.push('Low training volume allows recovery');
        trend = 'decreasing';
      }

      if (totalMinutes > 300) {
        factors.push('High total training duration');
      }

      if (factors.length === 0) {
        factors.push('Balanced training load');
      }

      const riskLevel = score > 70 ? 'high' : score > 40 ? 'medium' : 'low';
      const recommendation = score > 70
        ? 'Consider taking a rest day or doing a light recovery session.'
        : score > 40
          ? 'Your fatigue level is moderate. Listen to your body.'
          : 'You are well-rested and ready for training.';

      res.json({ score, trend, recommendation, factors, riskLevel });
    } catch (error: any) {
      console.error('Get fatigue score error:', error);
      res.status(500).json({ error: 'Failed to fetch fatigue score' });
    }
  });

  app.get('/api/analytics/performance', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const stats = await storage.getWeeklyStats(req.userId!, weekStart);

      const trainingLoad = stats.workoutCount * 20 + stats.totalDuration / 60;

      res.json({
        trainingLoad: Math.round(trainingLoad),
        fitnessLevel: Math.min(100, Math.round(trainingLoad * 0.8)),
        fatigueLevel: Math.min(100, Math.round(trainingLoad * 0.5)),
        injuryRisk: trainingLoad > 200 ? 'high' : trainingLoad > 100 ? 'medium' : 'low',
      });
    } catch (error: any) {
      console.error('Get performance error:', error);
      res.status(500).json({ error: 'Failed to fetch performance metrics' });
    }
  });

  app.get('/api/analytics/injury-risk', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const recentWorkouts = await storage.getRecentWorkouts(req.userId!, 14);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const lastWeekCount = recentWorkouts.filter(w => new Date(w.startTime) >= weekAgo).length;

      const riskLevel = lastWeekCount >= 7 ? 'high' : lastWeekCount >= 5 ? 'medium' : 'low';
      const riskScore = Math.min(100, lastWeekCount * 14);

      res.json({
        riskLevel,
        riskScore,
        factors: lastWeekCount >= 5
          ? ['High training frequency', 'Insufficient rest between sessions']
          : ['Training load within safe range'],
        recommendation: lastWeekCount >= 5
          ? 'Consider reducing training frequency to prevent overuse injuries.'
          : 'Your current training load is within a safe range.',
      });
    } catch (error: any) {
      console.error('Get injury risk error:', error);
      res.status(500).json({ error: 'Failed to fetch injury risk' });
    }
  });

  app.get('/api/analytics/predictions', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const recentWorkouts = await storage.getRecentWorkouts(req.userId!, 30);

      const predictions: any[] = [];

      if (recentWorkouts.length >= 3) {
        const avgDistance = recentWorkouts.reduce((sum, w) => sum + (w.distanceMeters || 0), 0) / recentWorkouts.length;
        if (avgDistance > 0) {
          predictions.push({
            type: 'distance_trend',
            metric: 'Weekly Distance',
            currentValue: Math.round(avgDistance),
            predictedValue: Math.round(avgDistance * 1.05),
            unit: 'meters',
            confidence: 0.65,
            timeframe: 'next 2 weeks',
          });
        }

        predictions.push({
          type: 'consistency',
          metric: 'Training Consistency',
          currentValue: Math.min(100, Math.round((recentWorkouts.length / 30) * 100)),
          predictedValue: Math.min(100, Math.round((recentWorkouts.length / 30) * 105)),
          unit: '%',
          confidence: 0.6,
          timeframe: 'next month',
        });
      }

      res.json({ predictions });
    } catch (error: any) {
      console.error('Get predictions error:', error);
      res.status(500).json({ error: 'Failed to fetch predictions' });
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
      const ariaApiUrl = process.env.ARIA_API_URL || 'https://aria-dev-api.azurewebsites.net';
      console.log(`Proxying dashboard state to: ${ariaApiUrl}/api/v1/dashboard/state/${req.userId}`);

      const response = await fetch(`${ariaApiUrl}/api/v1/dashboard/state/${req.userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization || '',
          'X-Source': 'aria-mobile-proxy'
        }
      });

      if (!response.ok) {
        throw new Error(`Python backend error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { dashboard: any };
      // Python returns { success: true, dashboard: { ... } }
      // We expect data.dashboard to match the structure the frontend needs

      // Update local storage for caching/redundancy if needed, but for now we rely on Python
      // We might want to save the state locally for offline support later

      res.json(data.dashboard);
    } catch (error: any) {
      console.error('Get dashboard state error:', error);
      // Fallback to basic rule-based local logic in case of failure? 
      // For now, fail to alert us to the issue
      res.status(500).json({ error: 'Failed to fetch dashboard state' });
    }
  });

  app.post('/api/dashboard/generate-insights', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const ariaApiUrl = process.env.ARIA_API_URL || 'https://aria-dev-api.azurewebsites.net';

      const response = await fetch(`${ariaApiUrl}/api/v1/dashboard/generate-insights/${req.userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization || '',
          'X-Source': 'aria-mobile-proxy'
        }
      });

      if (!response.ok) {
        throw new Error(`Python backend error: ${response.status}`);
      }

      const data = await response.json() as { suggestions?: any[] };
      res.json(data.suggestions || []);
    } catch (error: any) {
      console.error('Generate insights error:', error);
      res.status(500).json({ error: 'Failed to generate insights' });
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
      if (data.stream) {
        await handleChatStream(req.userId!, data, res);
      } else {
        const result = await handleChat(req.userId!, data);
        res.json(result);
      }
    } catch (error: any) {
      if (!res.headersSent) {
        console.error('Chat error:', error);
        if (error.name === 'ZodError') {
          res.status(400).json({ error: 'Invalid input', details: error.errors });
        } else {
          res.status(500).json({ error: 'Failed to process chat message' });
        }
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

  // ==================== NUTRITION PLANS ====================

  app.get('/api/nutrition/plans', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const plans = await storage.getNutritionPlans(req.userId!);
      res.json(plans);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch nutrition plans' });
    }
  });

  app.post('/api/nutrition/plans', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = createNutritionPlanSchema.parse(req.body);
      const plan = await storage.createNutritionPlan({ ...data, userId: req.userId! });
      res.status(201).json(plan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: 'Failed to create nutrition plan' });
    }
  });

  app.get('/api/nutrition/plans/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const plan = await storage.getNutritionPlan(parseInt(req.params.id));
      if (!plan || plan.userId !== req.userId!) {
        return res.status(404).json({ error: 'Nutrition plan not found' });
      }
      res.json(plan);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch nutrition plan' });
    }
  });

  app.patch('/api/nutrition/plans/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const existing = await storage.getNutritionPlan(parseInt(req.params.id));
      if (!existing || existing.userId !== req.userId!) {
        return res.status(404).json({ error: 'Nutrition plan not found' });
      }
      const plan = await storage.updateNutritionPlan(parseInt(req.params.id), req.body);
      res.json(plan);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update nutrition plan' });
    }
  });

  app.delete('/api/nutrition/plans/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const existing = await storage.getNutritionPlan(parseInt(req.params.id));
      if (!existing || existing.userId !== req.userId!) {
        return res.status(404).json({ error: 'Nutrition plan not found' });
      }
      await storage.deleteNutritionPlan(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete nutrition plan' });
    }
  });

  app.post('/api/nutrition/generate', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const input = generateNutritionSchema.parse(req.body);
      const aiResponse = await generateNutritionPlan(req.userId!, input);

      const parsedPlan = parseAIJsonResponse(aiResponse, 'nutrition');

      const plan = await storage.createNutritionPlan({
        userId: req.userId!,
        title: parsedPlan.title || 'AI Generated Nutrition Plan',
        description: parsedPlan.description || parsedPlan.analysis,
        activityLevel: input.activityLevel,
        season: input.season,
        calorieTarget: parsedPlan.calorieTarget,
        proteinGrams: parsedPlan.proteinGrams,
        carbsGrams: parsedPlan.carbsGrams,
        fatsGrams: parsedPlan.fatsGrams,
        mealSuggestions: parsedPlan.mealSuggestions,
        createdBy: 'ai',
        aiPromptUsed: JSON.stringify(input),
      });

      res.status(201).json(plan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Nutrition generation error:', error);
      res.status(500).json({ error: 'Failed to generate nutrition plan' });
    }
  });

  // ==================== PROGRAMS ====================

  app.get('/api/programs', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const progs = await storage.getPrograms(req.userId!);
      res.json(progs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch programs' });
    }
  });

  app.post('/api/programs', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = createProgramSchema2.parse(req.body);
      const program = await storage.createProgram({ ...data, userId: req.userId! });
      res.status(201).json(program);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: 'Failed to create program' });
    }
  });

  app.get('/api/programs/templates', authMiddleware, async (_req: AuthenticatedRequest, res: Response) => {
    const csv = `Aria Training Program Template,,,,,,
Instructions: Fill in each row with one day's training. Use separate rows for each event group if workouts differ.,,,,,,
Delete these instruction rows and example data before uploading.,,,,,,
,,,,,,
Date,Session Type,Event Group,Exercise / Workout,Sets x Reps / Distance,Intensity (%),Rest / Notes
3/3/2025,Sprint,100m,Sprintprep 1 (warmup + accelerations),See notes,,Jump rope / med ball tosses / rollups / multibounds / progressive sprints 20-80m
3/3/2025,Supplementary,Elite,Core / upper body circuit,,,
3/4/2025,Tempo,100m,Tempo Runs,5 x 200m,65-70%,4 min rest between reps
3/5/2025,Gym,100m,Deep Squats,5 x 8,,Progressive loading
3/5/2025,Gym,100m,Deadlift,5 x 6,,
3/5/2025,Gym,100m,Backstep Lunges,4 x 8 (4 per leg),,
3/5/2025,Gym,100m,Calf Raises,4 x 12,,Weight optional
3/5/2025,Gym,100m,Back Extension,4 x 25,,
3/5/2025,Gym,100m,Conc. Hamstring Curl,4 x 8,,
3/6/2025,Recovery,100m,Core,,,
3/6/2025,Supplementary,Elite,Core / upper body circuit,,,
3/7/2025,Speed,100m,Phosphate System,2 x 3 x 60m,90-92%,Walk back rest / 4 min between sets
3/8/2025,Gym,100m,Gym Session 0.5,,,See gym reference sheet
3/9/2025,Rest,100m,Rest Day,,,
3/10/2025,Speed,100m,F4s Sprint Sets,1x4x60 + 1x5x60 + 1x3x60m,90%,Walk rest / 2 min alt / 4 min between sets
3/10/2025,Supplementary,Elite,Core / upper body circuit,,,
,,,,,,
=== WEEK 2 (Microdose Week) ===,,,,,,
3/11/2025,Gym (Micro),100m,Box Jumps,3 x 4,,
3/11/2025,Gym (Micro),100m,Deep Squats,4 x 4,,
3/11/2025,Gym (Micro),100m,Lunges,3 x 3 per leg,,
3/11/2025,Gym (Micro),100m,ISO Mid-thigh Pull,3 x 3 (4s hold),,
3/11/2025,Gym (Micro),100m,Eccentric Hamstring,3 x 4,,
3/11/2025,Gym (Micro),100m,Ankle Hops,4 x 6,,
3/12/2025,Gym (Micro),100m,Box Jumps Frog,2 x 3,,Reduced volume
3/12/2025,Gym (Micro),100m,Deep Squats,3 x 3,,
3/12/2025,Gym (Micro),100m,Lunges,2 x 3 per leg,,
3/12/2025,Gym (Micro),100m,Eccentric Hamstring,2 x 4,,
3/13/2025,Recovery,100m,Core,,,
,,,,,,
=== REFERENCE: SESSION TYPES ===,,,,,,
Sprint - Sprint prep / acceleration / block work,,,,,,
Tempo - Sub-maximal aerobic capacity runs (60-80%),,,,,,
Speed - Maximal or near-maximal sprint work (90-100%),,,,,,
Gym - Strength / weightroom sessions,,,,,,
Gym (Micro) - Microdose / reduced-volume strength,,,,,,
Recovery - Core / mobility / active recovery,,,,,,
Supplementary - Extra sessions (elite athletes),,,,,,
Rest - Full rest day,,,,,,
Competition - Meet / race day,,,,,,
,,,,,,
=== REFERENCE: EVENT GROUPS ===,,,,,,
100m | 200m | 400m | Hurdles | All | Elite,,,,,,
,,,,,,
=== REFERENCE: INTENSITY GUIDE ===,,,,,,
80% - Easy / warmup pace,,,,,,
85% - Moderate / controlled,,,,,,
90% - Fast / quality reps,,,,,,
92% - High quality,,,,,,
92-95% - Near max,,,,,,
95-100% - Max effort / competition,,,,,,`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=Aria_Program_Template.csv');
    res.send(csv);
  });

  app.get('/api/programs/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const program = await storage.getProgram(parseInt(req.params.id));
      if (!program || program.userId !== req.userId!) {
        return res.status(404).json({ error: 'Program not found' });
      }
      const sessions = await storage.getProgramSessions(program.id);
      res.json({ ...program, sessions });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch program' });
    }
  });

  app.patch('/api/programs/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const existing = await storage.getProgram(parseInt(req.params.id));
      if (!existing || existing.userId !== req.userId!) {
        return res.status(404).json({ error: 'Program not found' });
      }
      const program = await storage.updateProgram(parseInt(req.params.id), req.body);
      res.json(program);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update program' });
    }
  });

  app.delete('/api/programs/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const existing = await storage.getProgram(parseInt(req.params.id));
      if (!existing || existing.userId !== req.userId!) {
        return res.status(404).json({ error: 'Program not found' });
      }
      if (existing.programFileUrl) {
        try {
          const blobName = existing.programFileUrl.split('/').pop();
          if (blobName) await deleteBlob(blobName);
        } catch (e) { console.error('Failed to delete blob:', e); }
      }
      await storage.deleteProgram(parseInt(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete program' });
    }
  });

  app.post('/api/programs/upload', authMiddleware, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { url, blobName } = await uploadFileToBlob(req.file.buffer, req.file.originalname, req.file.mimetype);
      const parsed = await parseDocument(req.file.buffer, req.file.mimetype);

      const program = await storage.createProgram({
        userId: req.userId!,
        title: req.body.title || req.file.originalname,
        description: req.body.description || `Imported from ${req.file.originalname}`,
        isUploadedProgram: true,
        programFileUrl: url,
        programFileType: req.file.mimetype,
        textContent: parsed.text,
      });

      res.status(201).json(program);
    } catch (error) {
      console.error('File upload error:', error);
      res.status(500).json({ error: 'Failed to upload program file' });
    }
  });

  app.post('/api/programs/import-sheet', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = importSheetSchema.parse(req.body);
      const program = await storage.createProgram({
        userId: req.userId!,
        title: data.title,
        description: data.description || 'Imported from Google Sheets',
        importedFromSheet: true,
        googleSheetUrl: data.googleSheetUrl,
      });
      res.status(201).json(program);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: 'Failed to import Google Sheet' });
    }
  });

  app.post('/api/programs/generate', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const input = generateProgramSchema.parse(req.body);
      const aiResponse = await generateProgram(req.userId!, input);

      const parsedProgram = parseAIJsonResponse(aiResponse, 'program');

      const program = await storage.createProgram({
        userId: req.userId!,
        title: parsedProgram.title || input.title || 'AI Generated Program',
        description: parsedProgram.description || parsedProgram.analysis,
        category: parsedProgram.category || input.category,
        level: parsedProgram.level || input.level,
        duration: parsedProgram.duration || input.durationWeeks,
        totalSessions: parsedProgram.sessions?.length,
        generatedBy: 'ai',
      });

      // Create sessions if AI provided them
      if (parsedProgram.sessions && Array.isArray(parsedProgram.sessions)) {
        for (const session of parsedProgram.sessions) {
          await storage.createProgramSession({
            programId: program.id,
            dayNumber: session.dayNumber,
            title: session.title,
            description: session.description,
            exercises: session.exercises,
            isRestDay: session.isRestDay || false,
          });
        }
      }

      const sessions = await storage.getProgramSessions(program.id);
      res.status(201).json({ ...program, sessions });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error('Program generation error:', error?.message || error);
      if (error?.stack) console.error('Stack:', error.stack);
      res.status(500).json({ error: 'Failed to generate program' });
    }
  });

  // ==================== PROGRAM SESSION CRUD ====================

  app.post('/api/programs/:id/sessions', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const programId = parseInt(req.params.id);
      const program = await storage.getProgram(programId);
      if (!program || program.userId !== req.userId!) {
        return res.status(404).json({ error: 'Program not found' });
      }
      const data = programSessionSchema.parse(req.body);
      const session = await storage.createProgramSession({ programId, ...data });
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: 'Failed to create session' });
    }
  });

  app.patch('/api/programs/:id/sessions/:sessionId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const programId = parseInt(req.params.id);
      const sessionId = parseInt(req.params.sessionId);
      const program = await storage.getProgram(programId);
      if (!program || program.userId !== req.userId!) {
        return res.status(404).json({ error: 'Program not found' });
      }
      const existing = await storage.getProgramSession(sessionId);
      if (!existing || existing.programId !== programId) {
        return res.status(404).json({ error: 'Session not found' });
      }
      const session = await storage.updateProgramSession(sessionId, req.body);
      res.json(session);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update session' });
    }
  });

  app.delete('/api/programs/:id/sessions/:sessionId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const programId = parseInt(req.params.id);
      const sessionId = parseInt(req.params.sessionId);
      const program = await storage.getProgram(programId);
      if (!program || program.userId !== req.userId!) {
        return res.status(404).json({ error: 'Program not found' });
      }
      const existing = await storage.getProgramSession(sessionId);
      if (!existing || existing.programId !== programId) {
        return res.status(404).json({ error: 'Session not found' });
      }
      await storage.deleteProgramSession(sessionId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete session' });
    }
  });

  app.put('/api/programs/:id/sessions', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const programId = parseInt(req.params.id);
      const program = await storage.getProgram(programId);
      if (!program || program.userId !== req.userId!) {
        return res.status(404).json({ error: 'Program not found' });
      }
      const { sessions } = req.body;
      if (!Array.isArray(sessions)) {
        return res.status(400).json({ error: 'sessions must be an array' });
      }

      const keepIds: number[] = [];
      const results = [];

      for (const s of sessions) {
        if (s.id) {
          // Update existing session
          const updated = await storage.updateProgramSession(s.id, s);
          if (updated) {
            keepIds.push(updated.id);
            results.push(updated);
          }
        } else {
          // Create new session
          const created = await storage.createProgramSession({ programId, ...s });
          keepIds.push(created.id);
          results.push(created);
        }
      }

      // Delete sessions not in the provided list
      await storage.deleteSessionsByProgramExcluding(programId, keepIds);

      // Return all sessions for the program
      const allSessions = await storage.getProgramSessions(programId);
      res.json(allSessions);
    } catch (error) {
      res.status(500).json({ error: 'Failed to sync sessions' });
    }
  });

  // ==================== PUSH TOKENS ====================

  app.post('/api/push-token', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { token } = z.object({ token: z.string().min(1) }).parse(req.body);
      await storage.updatePushToken(req.userId!, token);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: 'Failed to register push token' });
    }
  });

  // ==================== HEALTH CHECK ====================

  app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
}
