import { storage } from './storage';
import { User, UserProfile, UserPreferences, TrainingPlan, Workout, NutritionPlan, Program, Event, HealthMetric, ConnectedDevice } from '../shared/schema';

const ARIA_API_URL = process.env.ARIA_API_URL || 'https://ca-aria-api-prod.bravepond-d57ce243.westus.azurecontainerapps.io';
const METERS_PER_MILE = 1609.34;
const METERS_PER_KILOMETER = 1000;
type UnitSystem = 'imperial' | 'metric';

function resolveUnitSystem(preferredUnits?: string | null, profileUnits?: string | null): UnitSystem {
  if (preferredUnits === 'imperial' || preferredUnits === 'metric') {
    return preferredUnits;
  }
  if (profileUnits === 'metric') {
    return 'metric';
  }
  return 'imperial';
}

function formatDistanceForUnits(distanceMeters: number | null | undefined, units: UnitSystem): string {
  if (!distanceMeters || !Number.isFinite(distanceMeters)) return 'N/A';
  if (units === 'metric') {
    return `${(distanceMeters / METERS_PER_KILOMETER).toFixed(2)} km`;
  }
  return `${(distanceMeters / METERS_PER_MILE).toFixed(2)} mi`;
}

function getUnitInstruction(units: UnitSystem): string {
  if (units === 'metric') {
    return 'Use metric units only for all distances and pace references (meters, kilometers, min/km).';
  }
  return 'Use imperial units only for all distances and pace references (yards, miles, min/mi). Do not use meters or kilometers.';
}

// ==================== SYSTEM PROMPT ====================

export function buildAriaSystemPrompt(): string {
  return `You are Aria, an AI running coach and training companion for athletes of all levels.

PERSONALITY:
- Supportive, encouraging, and empathetic - like a trusted training partner
- Motivational and energetic without being pushy
- Celebrates wins, recognizes effort, and helps bounce back from setbacks
- Adapts communication style to the athlete's emotional state and needs

KEY BEHAVIORS:

1. Personalization & Context Awareness:
   - Always adapt advice to the athlete's sport, experience level, and goals
   - Incorporate recent training history, injuries, and performance data when provided
   - Adjust tone and difficulty based on the athlete's current mood and training phase

2. Expert Knowledge:
   - Provide accurate, sport-specific training plans, drills, recovery methods, and nutrition advice
   - Offer cross-training, mobility, and strength guidance for balanced performance
   - Suggest mental preparation strategies for competition and mindset resilience

3. Proactive Engagement:
   - Check in with encouragement, progress updates, or helpful reminders
   - Suggest new workouts or challenges based on recent performance
   - Remind about warm-ups, cooldowns, hydration, and recovery days

4. Multi-Modal Coaching:
   - Interpret wearable data such as heart rate, pace, cadence, and recovery stats
   - Analyze training patterns and suggest adjustments

5. Gamification & Motivation:
   - Acknowledge achievements with praise
   - Encourage progress tracking with PBs (personal bests) and streaks
   - Suggest fun challenges to keep training engaging

6. Communication Style:
   - Use short, high-energy motivational phrases during peak moments
   - Provide detailed, educational guidance during technical breakdowns
   - Offer encouragement when the athlete is struggling - focus on actionable solutions

ADDITIONAL EXPERTISE:
- Tailors advice by age, adjusting periodization, recovery, and injury prevention
- For athletes over 30, considers profession and daily posture habits
- For master athletes (35+), includes injury prevention and recovery recommendations
- Provides injury support with practical return-to-sport protocols
- Considers sleep duration, quality, and emotional impact in recovery discussions

RESPONSE STYLE:
- Keep responses conversational and approachable
- Use markdown formatting for structure when helpful (headers, bullet points, numbered lists)
- Be concise but thorough - don't overwhelm with information
- Always end with an actionable suggestion or encouraging note when appropriate

HEALTH DATA COACHING RULES:
- If readiness score < 60: Recommend lighter training or active recovery
- If sleep duration < 6.5 hours: Note sleep deficit and suggest recovery-focused session
- If HRV trending down compared to baseline: Warn about potential overtraining
- If resting HR elevated > 5bpm above baseline: Suggest recovery day
- Always explain WHY using actual data values (e.g., "Your HRV of 28ms is below your typical range...")
- If no health data is connected, do NOT mention wearables or health metrics`;
}

export function getCoachingStyleModifier(style?: string | null): string {
  switch (style) {
    case 'motivational':
      return `\n\nCOACHING STYLE: MOTIVATIONAL
- Be extra encouraging and enthusiastic
- Celebrate every effort and progress, no matter how small
- Use motivational language and energy
- Focus on the positive aspects of training
- Help the athlete feel empowered and capable`;
    case 'technical':
      return `\n\nCOACHING STYLE: TECHNICAL
- Focus on data-driven analysis and biomechanics
- Provide detailed technical breakdowns
- Reference specific metrics, splits, and performance indicators
- Explain the science behind training recommendations
- Use precise terminology and quantifiable guidance`;
    case 'minimal':
      return `\n\nCOACHING STYLE: MINIMAL
- Keep responses very concise and direct
- No unnecessary filler or motivation speeches
- Just the essential information and actionable advice
- Bullet points over paragraphs
- Brief and to-the-point`;
    default: // 'balanced' or undefined
      return '';
  }
}

// ==================== USER CONTEXT BUILDER ====================

export interface UserContext {
  profile: UserProfile | undefined;
  preferences: UserPreferences | undefined;
  activePlan: TrainingPlan | undefined;
  recentWorkouts: Workout[];
  todaysPlannedWorkout: any;
  weeklyStats: {
    totalDistance: number;
    totalDuration: number;
    workoutCount: number;
    avgPace: string | null;
  };
  activeNutritionPlan: NutritionPlan | undefined;
  activePrograms: Program[];
  upcomingEvents: Event[];
  healthMetrics: HealthMetric | undefined;
  connectedDevices: ConnectedDevice[];
}

export async function buildUserContext(userId: number): Promise<UserContext> {
  const [profile, preferences, activePlan, recentWorkouts, todaysPlannedWorkout, nutritionPlans, allPrograms, upcomingEvents, latestHealthMetrics, connectedDevices] = await Promise.all([
    storage.getUserProfile(userId),
    storage.getUserPreferences(userId),
    storage.getActiveTrainingPlan(userId),
    storage.getRecentWorkouts(userId, 5),
    storage.getTodaysPlannedWorkout(userId),
    storage.getNutritionPlans(userId),
    storage.getPrograms(userId),
    storage.getUpcomingEvents(userId, 3),
    storage.getLatestHealthMetrics(userId),
    storage.getConnectedDevices(userId),
  ]);

  // Calculate weekly stats
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weeklyStats = await storage.getWeeklyStats(userId, weekStart);

  const activeNutritionPlan = nutritionPlans.find(p => p.status === 'active');
  const activePrograms = allPrograms.filter(p => p.status === 'active');

  return {
    profile,
    preferences,
    activePlan,
    recentWorkouts,
    todaysPlannedWorkout,
    weeklyStats,
    activeNutritionPlan,
    activePrograms,
    upcomingEvents,
    healthMetrics: latestHealthMetrics,
    connectedDevices,
  };
}

export function formatUserContextForAI(context: UserContext): string {
  const parts: string[] = [];
  const units = resolveUnitSystem(undefined, context.profile?.units);
  const paceUnit = units === 'metric' ? 'min/km' : 'min/mi';

  if (context.profile) {
    const p = context.profile;
    const age = p.dateOfBirth ? Math.floor((Date.now() - new Date(p.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000)) : null;

    parts.push(`ATHLETE PROFILE:
- Name: ${p.displayName || 'Athlete'}
- Sport: ${p.sport || 'Running'}
- Experience: ${p.experienceLevel || 'Not specified'}
- Goals: ${p.goalTags?.join(', ') || 'Not specified'}
- Units: ${units}${age ? `\n- Age: ${age}` : ''}${p.gender ? `\n- Gender: ${p.gender}` : ''}${p.height ? `\n- Height: ${p.height} cm` : ''}${p.weight ? `\n- Weight: ${p.weight} kg` : ''}${p.bodyFatPercentage ? `\n- Body Fat: ${p.bodyFatPercentage}%` : ''}${p.country ? `\n- Country: ${p.country}` : ''}`);

    // Wellness section
    const wellnessParts: string[] = [];
    if (p.averageSleepHours) wellnessParts.push(`Sleep: ${p.averageSleepHours}h/night`);
    if (p.sleepQuality) wellnessParts.push(`Quality: ${p.sleepQuality}`);
    if (p.currentMood) wellnessParts.push(`Mood: ${p.currentMood}`);
    if (p.injuryStatus && p.injuryStatus !== 'healthy') wellnessParts.push(`Injury: ${p.injuryStatus}`);
    if (p.injuryHistory) wellnessParts.push(`History: ${p.injuryHistory}`);
    if (wellnessParts.length > 0) {
      parts.push(`\nWELLNESS:\n- ${wellnessParts.join('\n- ')}`);
    }

    // Training preferences
    const trainingParts: string[] = [];
    if (p.activityLevel) trainingParts.push(`Activity Level: ${p.activityLevel}`);
    if (p.trainingDaysPerWeek) trainingParts.push(`Training Days/Week: ${p.trainingDaysPerWeek}`);
    if ((p.trainingFocus as string[] | null)?.length) trainingParts.push(`Focus: ${(p.trainingFocus as string[]).join(', ')}`);
    if (context.preferences?.preferredWorkoutTime) trainingParts.push(`Preferred Time: ${context.preferences.preferredWorkoutTime}`);
    if (trainingParts.length > 0) {
      parts.push(`\nTRAINING PREFERENCES:\n- ${trainingParts.join('\n- ')}`);
    }
  }

  if (context.activePlan) {
    parts.push(`\nCURRENT TRAINING PLAN:
- Plan: ${context.activePlan.planName}
- Target Event: ${context.activePlan.targetEventName || 'General fitness'}
- Target Date: ${context.activePlan.targetEventDate ? new Date(context.activePlan.targetEventDate).toLocaleDateString() : 'Not set'}
- Status: ${context.activePlan.status}`);
  }

  if (context.todaysPlannedWorkout) {
    parts.push(`\nTODAY'S PLANNED WORKOUT:
- Type: ${context.todaysPlannedWorkout.type}
- Title: ${context.todaysPlannedWorkout.title || context.todaysPlannedWorkout.type}
- Duration: ${context.todaysPlannedWorkout.targetDuration ? `${Math.round(context.todaysPlannedWorkout.targetDuration / 60)} min` : 'Not specified'}
- Notes: ${context.todaysPlannedWorkout.notes || 'None'}`);
  }

  if (context.recentWorkouts.length > 0) {
    const sprintLogs = context.recentWorkouts.filter((w: any) => w.type === 'sprint_log');
    const otherWorkouts = context.recentWorkouts.filter((w: any) => w.type !== 'sprint_log');

    if (sprintLogs.length > 0) {
      parts.push(`\nRECENT SPRINT TRAINING LOGS:`);
      sprintLogs.forEach((workout: any) => {
        const date = new Date(workout.startTime).toLocaleDateString();
        parts.push(`\n${date}: ${workout.title || 'Sprint Session'}`);
        if (workout.notes) parts.push(`  Notes: ${workout.notes}`);
        if (workout.splits?.length > 0) {
          workout.splits.forEach((split: any) => {
            if (split.exerciseName && split.repTimes?.length) {
              const times = split.repTimes.map((t: number) => `${t.toFixed(2)}s`).join(', ');
              const best = Math.min(...split.repTimes).toFixed(2);
              const avg = (split.repTimes.reduce((a: number, b: number) => a + b, 0) / split.repTimes.length).toFixed(2);
              parts.push(`  ${split.exerciseName}: ${times} (best: ${best}s, avg: ${avg}s)`);
            }
          });
        }
      });
    }

    if (otherWorkouts.length > 0) {
      parts.push(`\nRECENT WORKOUTS (last ${otherWorkouts.length}):`);
      otherWorkouts.forEach((workout: any) => {
        const date = new Date(workout.startTime).toLocaleDateString();
        const distance = formatDistanceForUnits(workout.distanceMeters, units);
        const duration = workout.durationSeconds ? `${Math.round(workout.durationSeconds / 60)} min` : 'N/A';
        parts.push(`- ${date}: ${workout.type} - ${distance}, ${duration}, pace: ${workout.avgPace || `N/A (${paceUnit})`}`);
      });
    }
  }

  parts.push(`\nWEEKLY STATS:
- Distance: ${formatDistanceForUnits(context.weeklyStats.totalDistance, units)}
- Duration: ${Math.round(context.weeklyStats.totalDuration / 60)} min
- Workouts: ${context.weeklyStats.workoutCount}
- Avg Pace: ${context.weeklyStats.avgPace || `N/A (${paceUnit})`}`);

  if (context.healthMetrics && context.connectedDevices.length > 0) {
    const hm = context.healthMetrics;
    const providers = context.connectedDevices.map(d => d.provider).join(', ');
    const healthParts: string[] = [`- Connected Devices: ${providers}`];

    if (hm.sleepDurationSeconds != null) {
      const sleepHours = (hm.sleepDurationSeconds / 3600).toFixed(1);
      let sleepLine = `- Sleep: ${sleepHours} hours`;
      if (hm.sleepEfficiency != null) sleepLine += ` (efficiency: ${Math.round(hm.sleepEfficiency * 100)}%)`;
      if (hm.deepSleepSeconds != null) sleepLine += `, Deep: ${(hm.deepSleepSeconds / 3600).toFixed(1)}h`;
      if (hm.remSleepSeconds != null) sleepLine += `, REM: ${(hm.remSleepSeconds / 3600).toFixed(1)}h`;
      healthParts.push(sleepLine);
    }

    if (hm.restingHeartRate != null || hm.hrvRmssd != null) {
      const hrParts: string[] = [];
      if (hm.restingHeartRate != null) hrParts.push(`Resting HR: ${hm.restingHeartRate} bpm`);
      if (hm.hrvRmssd != null) hrParts.push(`HRV (RMSSD): ${hm.hrvRmssd.toFixed(1)} ms`);
      healthParts.push(`- ${hrParts.join(' | ')}`);
    }

    if (hm.readinessScore != null) healthParts.push(`- Readiness Score: ${hm.readinessScore}/100`);
    if (hm.recoveryScore != null) healthParts.push(`- Recovery Score: ${hm.recoveryScore}/100`);
    if (hm.stressScore != null) healthParts.push(`- Stress Score: ${hm.stressScore}`);
    if (hm.bodyBattery != null) healthParts.push(`- Body Battery: ${hm.bodyBattery}`);

    if (hm.steps != null || hm.activeMinutes != null) {
      const actParts: string[] = [];
      if (hm.steps != null) actParts.push(`Steps: ${hm.steps.toLocaleString()}`);
      if (hm.activeMinutes != null) actParts.push(`Active Minutes: ${hm.activeMinutes}`);
      healthParts.push(`- ${actParts.join(' | ')}`);
    }

    if (hm.weightKg != null) {
      let bodyLine = `- Weight: ${hm.weightKg.toFixed(1)} kg`;
      if (hm.bodyFatPercentage != null) bodyLine += ` | Body Fat: ${hm.bodyFatPercentage.toFixed(1)}%`;
      healthParts.push(bodyLine);
    }

    // Training recommendation based on data
    let recommendation = 'High intensity OK';
    if ((hm.readinessScore != null && hm.readinessScore < 60) ||
        (hm.recoveryScore != null && hm.recoveryScore < 60)) {
      recommendation = 'Recovery day suggested';
    } else if ((hm.readinessScore != null && hm.readinessScore < 75) ||
               (hm.sleepDurationSeconds != null && hm.sleepDurationSeconds < 6.5 * 3600)) {
      recommendation = 'Light training recommended';
    }
    healthParts.push(`- Training Recommendation: ${recommendation}`);

    parts.push(`\nWEARABLE HEALTH DATA (${new Date(hm.date).toLocaleDateString()}):\n${healthParts.join('\n')}`);
  }

  if (context.activeNutritionPlan) {
    const np = context.activeNutritionPlan;
    parts.push(`\nACTIVE NUTRITION PLAN:
- Title: ${np.title}
- Calories: ${np.calorieTarget || 'Not set'}
- Macros: P${np.proteinGrams || '?'}g / C${np.carbsGrams || '?'}g / F${np.fatsGrams || '?'}g`);
  }

  if (context.activePrograms.length > 0) {
    parts.push(`\nACTIVE PROGRAMS:`);
    context.activePrograms.forEach((prog) => {
      parts.push(`- ${prog.title} (${prog.category || 'general'}, week ${prog.activeWeek || 1}/${prog.duration || '?'})`);
    });
  }

  if (context.upcomingEvents.length > 0) {
    parts.push(`\nUPCOMING EVENTS:`);
    context.upcomingEvents.forEach((evt) => {
      const daysUntil = Math.ceil((new Date(evt.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      const goalStr = evt.goalTime ? `, goal: ${evt.goalTime}s` : '';
      parts.push(`- ${evt.name} (${evt.eventType}) - ${new Date(evt.date).toLocaleDateString()} (in ${daysUntil} days)${evt.distanceLabel ? `, ${evt.distanceLabel}` : ''}${goalStr}`);
    });
  }

  return parts.join('\n');
}

// ==================== RESPONSE CLEANING ====================

export function cleanAIResponse(response: string, userMessage: string): string {
  if (!response) return response;

  let cleaned = response;

  // Remove markdown code blocks
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
  cleaned = cleaned.replace(/```\s*$/i, '');

  // Remove JSON object wrapper
  cleaned = cleaned.replace(/^\{\s*"[^"]+"\s*:\s*"/i, '');
  cleaned = cleaned.replace(/"\s*,?\s*"[^"]*"\s*:\s*\[[\s\S]*?\]\s*\}\s*$/i, '');

  // Remove array brackets
  cleaned = cleaned.replace(/^\[\s*/, '').replace(/\s*\]\s*$/, '');

  // Remove remaining JSON structure
  cleaned = cleaned.replace(/^\{\s*/i, '').replace(/\s*\}\s*$/i, '');

  // Remove escaped quotes
  cleaned = cleaned.replace(/\\"/g, '"');

  cleaned = cleaned.trim();

  // Remove bibliography section unless user explicitly asks for sources
  const askingForSources = /\b(source|reference|bibliograph|citation|study|research|paper)\b/i.test(userMessage);
  if (!askingForSources) {
    cleaned = cleaned.replace(/\*\*[""\u201c\u201d]?bibliography[""\u201c\u201d]?:\*\*[\s\S]*$/gi, '');
    cleaned = cleaned.replace(/\*\*[""\u201c\u201d]?references[""\u201c\u201d]?:\*\*[\s\S]*$/gi, '');
    cleaned = cleaned.replace(/\*\*[""\u201c\u201d]?sources[""\u201c\u201d]?:\*\*[\s\S]*$/gi, '');
    cleaned = cleaned.replace(/\n\n[""\u201c\u201d]?bibliography[""\u201c\u201d]?:[\s\S]*$/gi, '');
    cleaned = cleaned.replace(/\n\n[""\u201c\u201d]?references[""\u201c\u201d]?:[\s\S]*$/gi, '');
    cleaned = cleaned.replace(/\n\n[""\u201c\u201d]?sources[""\u201c\u201d]?:[\s\S]*$/gi, '');
  }

  // Clean up extra whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.trim();

  // Remove leading/trailing quotes
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1);
  }
  if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
    cleaned = cleaned.slice(1, -1);
  }

  return cleaned;
}

// ==================== ARIA API CALL ====================

export interface AriaAPIRequest {
  user_id: string;
  user_input: string;
  system_prompt: string;
  conversation_history: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface AriaAPIResponse {
  recommendation?: string;
  response?: string;
}

export async function callAriaAPI(request: AriaAPIRequest): Promise<string> {
  const requestId = Math.random().toString(36).slice(2, 8);
  const requestStart = Date.now();

  console.log('Sending to Aria API:', {
    request_id: requestId,
    user_id: request.user_id,
    user_input_length: request.user_input.length,
    conversation_history_count: request.conversation_history.length,
  });

  try {
    const response = await fetch(`${ARIA_API_URL}/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    const durationMs = Date.now() - requestStart;

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Aria API error (${response.status}):`, errorText);
      console.error('Aria timing (failed):', {
        request_id: requestId,
        duration_ms: durationMs,
      });
      throw new Error(`Aria API returned ${response.status}`);
    }

    const data = (await response.json()) as AriaAPIResponse;
    const aiResponse = data.recommendation || data.response || "I'm here to help with your training. Could you please rephrase your question?";

    console.log('Aria timing:', {
      request_id: requestId,
      duration_ms: durationMs,
    });

    return aiResponse;
  } catch (error) {
    console.error('Aria API call failed:', error);
    throw error;
  }
}

export interface StreamCallbacks {
  onChunk: (content: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

export async function callAriaAPIStream(request: AriaAPIRequest, callbacks: StreamCallbacks): Promise<void> {
  const requestId = Math.random().toString(36).slice(2, 8);
  console.log('Sending to Aria API (streaming):', {
    request_id: requestId,
    user_id: request.user_id,
    user_input_length: request.user_input.length,
  });

  const response = await fetch(`${ARIA_API_URL}/ask/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Aria API returned ${response.status}: ${errorText}`);
  }

  if (!response.body) {
    throw new Error('Response body is null');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const data = trimmed.substring(6);

      if (data === '[DONE]') {
        callbacks.onDone();
        return;
      }

      try {
        const parsed = JSON.parse(data);
        if (parsed.type === 'chunk' && parsed.content) {
          callbacks.onChunk(parsed.content);
        } else if (parsed.type === 'error') {
          callbacks.onError(parsed.message || 'Unknown streaming error');
          return;
        }
      } catch {
        // Skip unparseable lines
      }
    }
  }

  // If stream ended without [DONE], call onDone anyway
  callbacks.onDone();
}

// ==================== NUTRITION PLAN GENERATION ====================

export interface NutritionPlanInput {
  activityLevel?: string;
  season?: string;
  dietaryRestrictions?: string[];
  foodPreferences?: Record<string, any>;
  locality?: string;
  calorieTarget?: number;
  notes?: string;
  preferredUnits?: UnitSystem;
}

export async function generateNutritionPlan(userId: number, input: NutritionPlanInput): Promise<string> {
  const userContext = await buildUserContext(userId);
  const contextString = formatUserContextForAI(userContext);
  const units = resolveUnitSystem(input.preferredUnits, userContext.profile?.units);
  const unitInstruction = getUnitInstruction(units);

  const nutritionRequest = `Create a personalized nutrition plan for me with these parameters:
- Activity Level: ${input.activityLevel || 'moderate'}
- Season: ${input.season || 'in_season'}
- Dietary Restrictions: ${input.dietaryRestrictions?.join(', ') || 'None'}
- Food Preferences/Locality: ${input.locality || 'No preference'}
- Preferred Units: ${units}
${input.calorieTarget ? `- Target Calories: ${input.calorieTarget}` : ''}
${input.notes ? `- Notes: ${input.notes}` : ''}

You MUST return your response as a JSON object with "analysis" and "recommendation" fields.
The "recommendation" field MUST contain a JSON string (escaped) with the nutrition plan.
The "analysis" field should be a brief summary of the plan.

Example response format:
{"analysis": "Created a 2800 calorie plan for sprint performance", "recommendation": "{\\"title\\": \\"Sprint Athlete Nutrition Plan\\", \\"description\\": \\"A high-performance nutrition plan\\", \\"calorieTarget\\": 2800, \\"proteinGrams\\": 180, \\"carbsGrams\\": 350, \\"fatsGrams\\": 80, \\"mealSuggestions\\": [{\\"meal\\": \\"Breakfast\\", \\"calories\\": 600, \\"foods\\": [\\"3 eggs scrambled\\", \\"Oatmeal with banana\\"], \\"macros\\": {\\"protein\\": 35, \\"carbs\\": 70, \\"fats\\": 20}}]}"}

The nutrition plan JSON inside "recommendation" MUST include: title, description, calorieTarget (number), proteinGrams (number), carbsGrams (number), fatsGrams (number), and mealSuggestions (array with meal, calories, foods array, and macros object with protein/carbs/fats).
Include 4-6 meals/snacks.`;

  const systemPrompt = buildAriaSystemPrompt() + `

ADDITIONAL INSTRUCTIONS FOR NUTRITION PLAN:
- Create a structured nutrition plan optimized for sprint athletes
- Consider the athlete's activity level, season, and dietary restrictions
- Include locally available foods when locality is specified
- Provide 4-6 meals/snacks per day
- Ensure macros support athletic performance and recovery
- ${unitInstruction}
- Return your response as JSON with "analysis" and "recommendation" fields as instructed`;

  try {
    const rawResponse = await callAriaAPI({
      user_id: userId.toString(),
      user_input: nutritionRequest + '\n\n' + contextString,
      system_prompt: systemPrompt,
      conversation_history: [],
    });

    return rawResponse;
  } catch (error) {
    console.error('Nutrition plan generation failed:', error);
    throw new Error('Failed to generate nutrition plan');
  }
}

// ==================== PROGRAM GENERATION ====================

export interface ProgramGenerationInput {
  title?: string;
  category?: string;
  level?: string;
  durationWeeks?: number;
  description?: string;
  notes?: string;
  preferredUnits?: UnitSystem;
}

export async function generateProgram(userId: number, input: ProgramGenerationInput): Promise<string> {
  const userContext = await buildUserContext(userId);
  const contextString = formatUserContextForAI(userContext);
  const units = resolveUnitSystem(input.preferredUnits, userContext.profile?.units);
  const unitInstruction = getUnitInstruction(units);
  const sprintDistanceExample = units === 'metric' ? '40m Sprints' : '40yd Sprints';

  const programRequest = `Create a training program with these parameters:
- Category: ${input.category || 'sprint'}
- Level: ${input.level || 'intermediate'}
- Duration: ${input.durationWeeks || 4} weeks
- Preferred Units: ${units}
${input.description ? `- Description: ${input.description}` : ''}
${input.notes ? `- Notes: ${input.notes}` : ''}

You MUST return your response as a JSON object with "analysis" and "recommendation" fields.
The "recommendation" field MUST contain a JSON string (escaped) with the training program.
The "analysis" field should be a brief summary of the program.

Example response format:
{"analysis": "Created a 4-week sprint power program", "recommendation": "{\\"title\\": \\"Sprint Power Program\\", \\"description\\": \\"A periodized sprint training program\\", \\"category\\": \\"sprint\\", \\"level\\": \\"intermediate\\", \\"duration\\": 4, \\"sessions\\": [{\\"weekNumber\\": 1, \\"dayOfWeek\\": 1, \\"dayNumber\\": 1, \\"title\\": \\"Acceleration Work\\", \\"description\\": \\"Opening week acceleration focus\\", \\"isRestDay\\": false, \\"exercises\\": [{\\"name\\": \\"${sprintDistanceExample}\\", \\"sets\\": 6, \\"reps\\": \\"1\\", \\"rest\\": 180, \\"notes\\": \\"Full effort\\"}]}, {\\"weekNumber\\": 2, \\"dayOfWeek\\": 1, \\"dayNumber\\": 8, \\"title\\": \\"Max Velocity Progression\\", \\"description\\": \\"Week 2 builds on week 1 with higher intensity\\", \\"isRestDay\\": false, \\"exercises\\": [{\\"name\\": \\"Flying Sprints\\", \\"sets\\": 5, \\"reps\\": \\"1\\", \\"rest\\": 210, \\"notes\\": \\"Long recoveries\\"}]}, {\\"weekNumber\\": 1, \\"dayOfWeek\\": 2, \\"dayNumber\\": 2, \\"title\\": \\"Recovery\\", \\"description\\": \\"Light jog and stretching\\", \\"isRestDay\\": true, \\"exercises\\": []}]}"}

IMPORTANT rules for the JSON inside "recommendation":
- "reps" must be a string (e.g. "6", "8-10", "1"). "sets" and "rest" must be numbers.
- Every session MUST have "weekNumber", "dayOfWeek", "dayNumber", "title", "isRestDay", and "exercises" fields.
- "dayOfWeek" must use 1-7 for Monday-Sunday.
- "dayNumber" must equal ((weekNumber - 1) * 7) + dayOfWeek.
- Generate a full multi-week plan. Do NOT return a single 7-day template intended to be repeated.
- Include exactly ${(input.durationWeeks || 4) * 7} session objects, one for every day of the program, using rest-day sessions when needed.
- Weeks must progress across the full duration. Week 2+ should not be a verbatim copy of week 1.
- ${unitInstruction}`;

  const systemPrompt = buildAriaSystemPrompt() + `

ADDITIONAL INSTRUCTIONS FOR PROGRAM GENERATION:
- Create a periodized training program with progressive overload
- Include warm-up and cool-down recommendations
- Balance training load across the week
- Include rest days
- Progress the plan across all ${input.durationWeeks || 4} weeks instead of repeating one template week
- ${unitInstruction}
- Return your response as JSON with "analysis" and "recommendation" fields as instructed`;

  try {
    const rawResponse = await callAriaAPI({
      user_id: userId.toString(),
      user_input: programRequest + '\n\n' + contextString,
      system_prompt: systemPrompt,
      conversation_history: [],
    });

    return rawResponse;
  } catch (error) {
    console.error('Program generation failed:', error);
    throw error;
  }
}

// ==================== CHAT HANDLER ====================

export interface ChatInput {
  message: string;
  conversationId?: number;
}

export interface ChatResult {
  conversationId: number;
  response: string;
}

export async function handleChat(userId: number, input: ChatInput): Promise<ChatResult> {
  const { message, conversationId: existingConversationId } = input;

  let conversationId = existingConversationId;

  // Create new conversation if needed
  if (!conversationId) {
    const isUuidLike = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(message || '');
    const title = (message && !isUuidLike && message.trim().length > 0)
      ? message.slice(0, 50) + (message.length > 50 ? '...' : '')
      : 'New Conversation';

    const conversation = await storage.createAriaConversation({
      userId,
      title,
    });
    conversationId = conversation.id;
  }

  // Save user message
  await storage.createAriaMessage({
    conversationId,
    role: 'user',
    content: message,
    promptCost: 1,
  });

  // Fetch conversation history
  let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  try {
    const allMessages = await storage.getAriaMessages(conversationId);
    // Get last 10 messages (excluding the current one) for context
    conversationHistory = allMessages.slice(-11, -1).map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));
  } catch (error) {
    console.error('Error fetching conversation history:', error);
  }

  // Build user context
  const userContext = await buildUserContext(userId);
  const contextString = formatUserContextForAI(userContext);

  // Build system prompt with coaching style
  const coachingStyle = userContext.preferences?.aiCoachingStyle;
  const systemPrompt = buildAriaSystemPrompt() + getCoachingStyleModifier(coachingStyle);

  // Combine user message with context
  const userInputWithContext = `${message}\n\n${contextString}`;

  let aiResponse: string;

  try {
    const rawResponse = await callAriaAPI({
      user_id: userId.toString(),
      user_input: userInputWithContext,
      system_prompt: systemPrompt,
      conversation_history: conversationHistory,
    });

    // Clean the response
    aiResponse = cleanAIResponse(rawResponse, message);
  } catch (error) {
    console.error('Aria API call failed, using fallback:', error);
    aiResponse = "I'm having trouble connecting right now. Please try again in a moment!";
  }

  // Save AI response
  await storage.createAriaMessage({
    conversationId,
    role: 'assistant',
    content: aiResponse,
    promptCost: 0,
  });

  return {
    conversationId,
    response: aiResponse,
  };
}

export async function handleChatStream(userId: number, input: ChatInput, res: import('express').Response): Promise<void> {
  const { message, conversationId: existingConversationId } = input;

  let conversationId = existingConversationId;

  // Create new conversation if needed
  if (!conversationId) {
    const isUuidLike = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(message || '');
    const title = (message && !isUuidLike && message.trim().length > 0)
      ? message.slice(0, 50) + (message.length > 50 ? '...' : '')
      : 'New Conversation';

    const conversation = await storage.createAriaConversation({ userId, title });
    conversationId = conversation.id;
  }

  // Save user message
  await storage.createAriaMessage({
    conversationId,
    role: 'user',
    content: message,
    promptCost: 1,
  });

  // Fetch conversation history
  let conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  try {
    const allMessages = await storage.getAriaMessages(conversationId);
    conversationHistory = allMessages.slice(-11, -1).map((msg) => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
    }));
  } catch (error) {
    console.error('Error fetching conversation history:', error);
  }

  // Build context
  const userContext = await buildUserContext(userId);
  const contextString = formatUserContextForAI(userContext);
  const coachingStyle = userContext.preferences?.aiCoachingStyle;
  const systemPrompt = buildAriaSystemPrompt() + getCoachingStyleModifier(coachingStyle);
  const userInputWithContext = `${message}\n\n${contextString}`;

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Send metadata event with conversationId
  res.write(`data: ${JSON.stringify({ type: 'metadata', conversationId })}\n\n`);

  let accumulated = '';

  try {
    await callAriaAPIStream(
      {
        user_id: userId.toString(),
        user_input: userInputWithContext,
        system_prompt: systemPrompt,
        conversation_history: conversationHistory,
      },
      {
        onChunk: (content: string) => {
          accumulated += content;
          res.write(`data: ${JSON.stringify({ type: 'chunk', content })}\n\n`);
        },
        onDone: () => {
          // Will be handled after the await
        },
        onError: (errorMsg: string) => {
          res.write(`data: ${JSON.stringify({ type: 'error', message: errorMsg })}\n\n`);
        },
      }
    );

    // Clean and save the response
    const cleaned = cleanAIResponse(accumulated, message);

    await storage.createAriaMessage({
      conversationId,
      role: 'assistant',
      content: cleaned,
      promptCost: 0,
    });

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error('Streaming chat error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process streaming chat' });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: error.message || 'Streaming failed' })}\n\n`);
      res.end();
    }
  }
}

// ==================== PLAN GENERATION ====================

export interface PlanGenerationInput {
  targetEvent?: string;
  targetDate?: Date;
  currentFitnessLevel: 'beginner' | 'intermediate' | 'advanced' | 'elite';
  daysPerWeek: number;
  longRunDay?: string;
  includeSpeedwork?: boolean;
  includeStrength?: boolean;
  notes?: string;
  preferredUnits?: UnitSystem;
}

export async function generateTrainingPlan(userId: number, input: PlanGenerationInput): Promise<string> {
  const userContext = await buildUserContext(userId);
  const contextString = formatUserContextForAI(userContext);
  const units = resolveUnitSystem(input.preferredUnits, userContext.profile?.units);
  const unitInstruction = getUnitInstruction(units);

  const planRequest = `Please create a training plan for me with the following parameters:
- Target Event: ${input.targetEvent || 'General fitness improvement'}
- Target Date: ${input.targetDate ? input.targetDate.toLocaleDateString() : 'Flexible'}
- Current Fitness Level: ${input.currentFitnessLevel}
- Training Days Per Week: ${input.daysPerWeek}
- Preferred Long Run Day: ${input.longRunDay || 'Saturday'}
- Include Speedwork: ${input.includeSpeedwork ? 'Yes' : 'No'}
- Include Strength Training: ${input.includeStrength ? 'Yes' : 'No'}
- Preferred Units: ${units}
${input.notes ? `- Additional Notes: ${input.notes}` : ''}

Please provide a structured weekly training plan with specific workouts for each day.`;

  const systemPrompt = buildAriaSystemPrompt() + `

ADDITIONAL INSTRUCTIONS FOR PLAN GENERATION:
- Create a structured, progressive training plan
- Include specific workout details (distance, pace, intervals, etc.)
- Consider the athlete's current fitness level and goals
- Build in appropriate rest and recovery
- Progress difficulty gradually
- ${unitInstruction}
- Include variety to prevent boredom and overuse injuries`;

  try {
    const rawResponse = await callAriaAPI({
      user_id: userId.toString(),
      user_input: planRequest + '\n\n' + contextString,
      system_prompt: systemPrompt,
      conversation_history: [],
    });

    return cleanAIResponse(rawResponse, planRequest);
  } catch (error) {
    console.error('Plan generation failed:', error);
    throw new Error('Failed to generate training plan');
  }
}

// ==================== DASHBOARD AI ====================

export type DashboardMode = 'general' | 'workout_ready' | 'competition_day' | 'recovery_focus' | 'rest_day';

export interface DashboardCard {
  type: string;
  title?: string;
  subtitle?: string;
  content?: any;
  cta?: { label: string; action: string; data?: any };
  order: number;
}

export async function determineDashboardMode(userId: number): Promise<{
  mode: DashboardMode;
  context: {
    todaysRace?: any;
    todaysWorkout?: any;
    recentWorkouts: Workout[];
    weeklyStats: any;
  };
}> {
  const [todaysRace, todaysWorkout, recentWorkouts] = await Promise.all([
    storage.getTodaysRace(userId),
    storage.getTodaysPlannedWorkout(userId),
    storage.getRecentWorkouts(userId, 7),
  ]);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weeklyStats = await storage.getWeeklyStats(userId, weekStart);

  const context = {
    todaysRace,
    todaysWorkout,
    recentWorkouts,
    weeklyStats,
  };

  // Determine mode using rules
  let mode: DashboardMode;

  if (todaysRace) {
    mode = 'competition_day';
  } else if (todaysWorkout) {
    if (todaysWorkout.type === 'rest') {
      mode = 'rest_day';
    } else {
      mode = 'workout_ready';
    }
  } else {
    // Check for recovery signals (high training load, many consecutive days)
    const recentDaysWithWorkouts = recentWorkouts.filter((w) => {
      const daysDiff = (Date.now() - new Date(w.startTime).getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 3;
    }).length;

    if (recentDaysWithWorkouts >= 3) {
      mode = 'recovery_focus';
    } else {
      mode = 'general';
    }
  }

  return { mode, context };
}

export async function generateDashboardContent(
  userId: number,
  mode: DashboardMode,
  context: any
): Promise<{
  greeting: string;
  subtitle: string;
  cards: DashboardCard[];
}> {
  const profile = await storage.getUserProfile(userId);
  const name = profile?.displayName || 'Athlete';
  const hour = new Date().getHours();

  let timeGreeting: string;
  if (hour < 12) timeGreeting = 'Good morning';
  else if (hour < 17) timeGreeting = 'Good afternoon';
  else timeGreeting = 'Good evening';

  let greeting: string;
  let subtitle: string;
  const cards: DashboardCard[] = [];

  switch (mode) {
    case 'competition_day':
      greeting = `${timeGreeting}, ${name}!`;
      subtitle = `Race day! You've got this!`;
      cards.push({
        type: 'competition_card',
        title: context.todaysRace?.name || 'Race Day',
        subtitle: context.todaysRace?.distanceLabel || 'Your race',
        content: {
          tips: [
            'Warm up properly',
            'Stay hydrated',
            'Trust your training',
            'Start conservatively',
          ],
        },
        order: 0,
      });
      break;

    case 'workout_ready':
      greeting = `${timeGreeting}, ${name}!`;
      subtitle = `Ready to crush your ${context.todaysWorkout?.type || 'workout'}?`;
      cards.push({
        type: 'workout_card',
        title: context.todaysWorkout?.title || context.todaysWorkout?.type,
        subtitle: context.todaysWorkout?.description || 'Tap to view details',
        cta: { label: 'Start Workout', action: 'start_session' },
        order: 0,
      });
      break;

    case 'recovery_focus':
      greeting = `${timeGreeting}, ${name}!`;
      subtitle = `Great work lately! Let's focus on recovery today.`;
      cards.push({
        type: 'insight_card',
        title: 'Recovery Day',
        subtitle: 'Your body needs rest to get stronger',
        content: {
          tips: [
            'Light stretching or yoga',
            'Stay hydrated',
            'Get good sleep tonight',
            'Consider a foam rolling session',
          ],
        },
        order: 0,
      });
      break;

    case 'rest_day':
      greeting = `${timeGreeting}, ${name}!`;
      subtitle = `Enjoy your rest day!`;
      cards.push({
        type: 'insight_card',
        title: 'Rest Day',
        subtitle: 'Recovery is part of training',
        order: 0,
      });
      break;

    default:
      greeting = `${timeGreeting}, ${name}!`;
      subtitle = `Let's make today count!`;
      break;
  }

  // Add weekly stats card
  cards.push({
    type: 'stats_row',
    content: {
      metrics: [
        {
          label: 'Weekly Distance',
          value: `${(context.weeklyStats.totalDistance / 1609.34).toFixed(1)} mi`,
        },
        {
          label: 'Workouts',
          value: context.weeklyStats.workoutCount.toString(),
        },
        {
          label: 'Avg Pace',
          value: context.weeklyStats.avgPace || '--',
        },
      ],
    },
    order: 10,
  });

  return { greeting, subtitle, cards };
}
