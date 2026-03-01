import { storage } from './storage';
import { User, UserProfile, TrainingPlan, Workout } from '../shared/schema';

const ARIA_API_URL = process.env.ARIA_API_URL || 'https://aria-dev-api.azurewebsites.net';

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
- Always end with an actionable suggestion or encouraging note when appropriate`;
}

// ==================== USER CONTEXT BUILDER ====================

export interface UserContext {
  profile: UserProfile | undefined;
  activePlan: TrainingPlan | undefined;
  recentWorkouts: Workout[];
  todaysPlannedWorkout: any;
  weeklyStats: {
    totalDistance: number;
    totalDuration: number;
    workoutCount: number;
    avgPace: string | null;
  };
}

export async function buildUserContext(userId: number): Promise<UserContext> {
  const [profile, activePlan, recentWorkouts, todaysPlannedWorkout] = await Promise.all([
    storage.getUserProfile(userId),
    storage.getActiveTrainingPlan(userId),
    storage.getRecentWorkouts(userId, 5),
    storage.getTodaysPlannedWorkout(userId),
  ]);

  // Calculate weekly stats
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of current week
  weekStart.setHours(0, 0, 0, 0);

  const weeklyStats = await storage.getWeeklyStats(userId, weekStart);

  return {
    profile,
    activePlan,
    recentWorkouts,
    todaysPlannedWorkout,
    weeklyStats,
  };
}

export function formatUserContextForAI(context: UserContext): string {
  const parts: string[] = [];

  if (context.profile) {
    parts.push(`ATHLETE PROFILE:
- Name: ${context.profile.displayName || 'Athlete'}
- Sport: ${context.profile.sport || 'Running'}
- Experience: ${context.profile.experienceLevel || 'Not specified'}
- Goals: ${context.profile.goalTags?.join(', ') || 'Not specified'}
- Units: ${context.profile.units || 'imperial'}`);
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
    parts.push(`\nRECENT WORKOUTS (last 5):`);
    context.recentWorkouts.forEach((workout) => {
      const date = new Date(workout.startTime).toLocaleDateString();
      const distance = workout.distanceMeters ? `${(workout.distanceMeters / 1609.34).toFixed(2)} mi` : 'N/A';
      const duration = workout.durationSeconds ? `${Math.round(workout.durationSeconds / 60)} min` : 'N/A';
      parts.push(`- ${date}: ${workout.type} - ${distance}, ${duration}, pace: ${workout.avgPace || 'N/A'}`);
    });
  }

  parts.push(`\nWEEKLY STATS:
- Distance: ${(context.weeklyStats.totalDistance / 1609.34).toFixed(2)} mi
- Duration: ${Math.round(context.weeklyStats.totalDuration / 60)} min
- Workouts: ${context.weeklyStats.workoutCount}
- Avg Pace: ${context.weeklyStats.avgPace || 'N/A'}`);

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

  // Build system prompt
  const systemPrompt = buildAriaSystemPrompt();

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
}

export async function generateTrainingPlan(userId: number, input: PlanGenerationInput): Promise<string> {
  const userContext = await buildUserContext(userId);
  const contextString = formatUserContextForAI(userContext);

  const planRequest = `Please create a training plan for me with the following parameters:
- Target Event: ${input.targetEvent || 'General fitness improvement'}
- Target Date: ${input.targetDate ? input.targetDate.toLocaleDateString() : 'Flexible'}
- Current Fitness Level: ${input.currentFitnessLevel}
- Training Days Per Week: ${input.daysPerWeek}
- Preferred Long Run Day: ${input.longRunDay || 'Saturday'}
- Include Speedwork: ${input.includeSpeedwork ? 'Yes' : 'No'}
- Include Strength Training: ${input.includeStrength ? 'Yes' : 'No'}
${input.notes ? `- Additional Notes: ${input.notes}` : ''}

Please provide a structured weekly training plan with specific workouts for each day.`;

  const systemPrompt = buildAriaSystemPrompt() + `

ADDITIONAL INSTRUCTIONS FOR PLAN GENERATION:
- Create a structured, progressive training plan
- Include specific workout details (distance, pace, intervals, etc.)
- Consider the athlete's current fitness level and goals
- Build in appropriate rest and recovery
- Progress difficulty gradually
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
