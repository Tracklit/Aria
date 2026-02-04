import { env } from '../config/env';
import { getToken } from './tokenStorage';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  data?: unknown;
  headers?: Record<string, string>;
  rawResponse?: boolean;
  skipAuth?: boolean;
}

const defaultHeaders = {
  Accept: 'application/json',
};

const DEBUG_API = __DEV__;

export async function apiRequest<T = any>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', data, headers, rawResponse, skipAuth } = options;
  const url = path.startsWith('http') ? path : `${env.API_BASE_URL}${path}`;

  const requestHeaders: Record<string, string> = {
    ...defaultHeaders,
    ...(data ? { 'Content-Type': 'application/json' } : {}),
    ...headers,
  };

  let hasToken = false;
  if (!skipAuth) {
    const token = await getToken();
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
      hasToken = true;
    }
  }

  if (DEBUG_API) {
    console.log(`[API] ${method} ${path}`, {
      hasToken,
      skipAuth,
      baseUrl: env.API_BASE_URL,
    });
  }

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: data ? JSON.stringify(data) : undefined,
    });

    if (DEBUG_API) {
      console.log(`[API] ${method} ${path} -> ${response.status}`);
    }

    if (rawResponse) {
      return response as unknown as T;
    }

    const text = await response.text();
    let payload = null;

    try {
      payload = text ? JSON.parse(text) : null;
    } catch (parseError) {
      if (DEBUG_API) {
        console.log(`[API] Failed to parse response:`, text.substring(0, 200));
      }
    }

    if (!response.ok) {
      const errorMessage =
        payload?.error ||
        payload?.message ||
        text ||
        response.statusText ||
        'Request failed';

      if (DEBUG_API) {
        console.log(`[API] Error ${response.status}:`, errorMessage);
      }

      const error = new Error(errorMessage) as Error & {
        status?: number;
        payload?: unknown;
      };
      error.status = response.status;
      error.payload = payload ?? text;
      throw error;
    }

    if (DEBUG_API && path.includes('/api/sprinthia/chat')) {
      const preview =
        typeof payload?.response === 'string'
          ? payload.response.slice(0, 140)
          : typeof payload === 'string'
            ? payload.slice(0, 140)
            : JSON.stringify(payload).slice(0, 140);
      const payloadKeys =
        payload && typeof payload === 'object' ? Object.keys(payload) : [];
      console.log('[API] sprinthia chat payload', {
        conversationId: payload?.conversationId,
        responsePreview: preview,
        payloadKeys,
      });
      if (payload && typeof payload === 'object' && payload.error) {
        console.log('[API] sprinthia chat error field', payload.error);
      }
    }

    return payload as T;
  } catch (error) {
    if (DEBUG_API) {
      console.log(`[API] Network error for ${method} ${path}:`, error);
    }
    throw error;
  }
}

// ==================== API FUNCTIONS ====================

// Auth
export interface RegisterInput {
  name: string;
  email: string;
  username: string;
  password: string;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface LoginResponse {
  id: number | string;
  username?: string;
  email?: string;
  token: string;
}

export interface RegisterResponse {
  user: any;
  token: string;
  requiresOnboarding?: boolean;
}

export async function register(input: RegisterInput): Promise<RegisterResponse> {
  return apiRequest<RegisterResponse>('/api/register', {
    method: 'POST',
    data: input,
    skipAuth: true,
  });
}

export async function login(input: LoginInput): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/api/mobile/login', {
    method: 'POST',
    data: input,
    skipAuth: true,
  });
}

export async function logout(): Promise<void> {
  await apiRequest('/api/logout', { method: 'POST', rawResponse: true });
}

// User
export async function getCurrentUser() {
  return apiRequest('/api/user');
}

export async function updateUser(data: { profile?: any; preferences?: any }) {
  return apiRequest('/api/user', { method: 'PATCH', data });
}

export async function completeOnboarding() {
  return apiRequest('/api/user/complete-onboarding', { method: 'POST' });
}

// Training Plans
export async function getTrainingPlans() {
  return apiRequest('/api/plans');
}

export async function createTrainingPlan(data: any) {
  return apiRequest('/api/plans', { method: 'POST', data });
}

export async function getTrainingPlan(id: number) {
  return apiRequest(`/api/plans/${id}`);
}

export async function updateTrainingPlan(id: number, data: any) {
  return apiRequest(`/api/plans/${id}`, { method: 'PATCH', data });
}

export async function deleteTrainingPlan(id: number) {
  return apiRequest(`/api/plans/${id}`, { method: 'DELETE' });
}

export async function getPlannedWorkouts(planId: number) {
  return apiRequest(`/api/plans/${planId}/workouts`);
}

export async function createPlannedWorkout(planId: number, data: any) {
  return apiRequest(`/api/plans/${planId}/workouts`, { method: 'POST', data });
}

// Workouts
export async function getWorkouts(limit?: number) {
  const query = limit ? `?limit=${limit}` : '';
  return apiRequest(`/api/workouts${query}`);
}

export async function createWorkout(data: any) {
  return apiRequest('/api/workouts', { method: 'POST', data });
}

export async function getTodaysWorkout() {
  return apiRequest('/api/workouts/today');
}

export async function getWorkout(id: number) {
  return apiRequest(`/api/workouts/${id}`);
}

export async function completeWorkout(plannedWorkoutId: number, data: any) {
  return apiRequest(`/api/workouts/${plannedWorkoutId}/complete`, { method: 'POST', data });
}

export async function skipWorkout(plannedWorkoutId: number, reason: string) {
  return apiRequest(`/api/workouts/${plannedWorkoutId}/skip`, { method: 'POST', data: { reason } });
}

// Sessions
export async function startSession(plannedWorkoutId?: number) {
  return apiRequest('/api/sessions/start', {
    method: 'POST',
    data: plannedWorkoutId ? { plannedWorkoutId } : {},
  });
}

export async function updateSession(sessionId: number, data: any) {
  return apiRequest(`/api/sessions/${sessionId}`, { method: 'PATCH', data });
}

export async function addCheckpoint(sessionId: number, data: any) {
  return apiRequest(`/api/sessions/${sessionId}/checkpoint`, { method: 'POST', data });
}

export async function finishSession(sessionId: number, workoutData?: any) {
  return apiRequest(`/api/sessions/${sessionId}/finish`, {
    method: 'POST',
    data: workoutData ? { workoutData } : {},
  });
}

// Analytics
export async function getWeeklyAnalytics() {
  return apiRequest('/api/analytics/weekly');
}

export async function getAnalyticsTrends(weeks?: number) {
  const query = weeks ? `?weeks=${weeks}` : '';
  return apiRequest(`/api/analytics/trends${query}`);
}

export async function getTrainingPatterns() {
  return apiRequest('/api/analytics/patterns');
}

export async function getFatigueScore() {
  return apiRequest('/api/analytics/fatigue-score');
}

export async function getPerformanceMetrics(period?: 'week' | 'month' | 'year') {
  const query = period ? `?period=${period}` : '';
  return apiRequest(`/api/analytics/performance${query}`);
}

export async function getInjuryRisk() {
  return apiRequest('/api/analytics/injury-risk');
}

export async function getPerformancePredictions() {
  return apiRequest('/api/analytics/predictions');
}

// Insights
export async function getInsights() {
  return apiRequest('/api/insights');
}

export async function dismissInsight(id: number) {
  return apiRequest(`/api/insights/${id}/dismiss`, { method: 'POST' });
}

// Dashboard
export async function getDashboardState() {
  return apiRequest('/api/dashboard/state');
}

export async function generateDashboardInsights(context: any) {
  return apiRequest('/api/dashboard/generate-insights', {
    method: 'POST',
    data: { context, maxInsights: 5 },
  });
}

// Aria AI
export async function getConversations() {
  return apiRequest('/api/sprinthia/conversations');
}

export async function createConversation(title?: string) {
  return apiRequest('/api/sprinthia/conversations', { method: 'POST', data: { title } });
}

export async function getConversationMessages(conversationId: number) {
  return apiRequest(`/api/sprinthia/conversations/${conversationId}/messages`);
}

export async function deleteConversation(conversationId: number) {
  return apiRequest(`/api/sprinthia/conversations/${conversationId}`, { method: 'DELETE' });
}

export interface ChatInput {
  message: string;
  conversationId?: number;
}

export interface ChatResponse {
  conversationId: number;
  response: string;
}

export async function sendChatMessage(input: ChatInput): Promise<ChatResponse> {
  return apiRequest('/api/sprinthia/chat', { method: 'POST', data: input });
}

// Streaming Chat
export async function sendChatMessageStream(
  input: ChatInput,
  onChunk: (text: string) => void,
  onComplete?: () => void,
  onError?: (error: Error) => void
): Promise<void> {
  const token = await getToken();
  const url = `${env.API_BASE_URL}/api/sprinthia/chat`;

  if (DEBUG_API) {
    console.log('[API] POST /api/sprinthia/chat (streaming)');
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({ ...input, stream: true }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Streaming request failed with status ${response.status}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    // Read the stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        if (DEBUG_API) {
          console.log('[API] Stream completed');
        }
        onComplete?.();
        break;
      }

      // Decode the chunk
      buffer += decoder.decode(value, { stream: true });

      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();

        if (trimmed === '') continue;

        // Handle SSE format: "data: {json}"
        if (trimmed.startsWith('data: ')) {
          const data = trimmed.substring(6);

          if (data === '[DONE]') {
            if (DEBUG_API) {
              console.log('[API] Received [DONE] signal');
            }
            onComplete?.();
            return;
          }

          try {
            const parsed = JSON.parse(data);

            // Handle different streaming formats
            if (parsed.content) {
              onChunk(parsed.content);
            } else if (parsed.token) {
              onChunk(parsed.token);
            } else if (parsed.text) {
              onChunk(parsed.text);
            } else if (typeof parsed === 'string') {
              onChunk(parsed);
            }
          } catch (parseError) {
            // If not JSON, treat as plain text
            onChunk(data);
          }
        } else {
          // Non-SSE format, just plain text
          onChunk(trimmed);
        }
      }
    }
  } catch (error) {
    if (DEBUG_API) {
      console.error('[API] Streaming error:', error);
    }
    onError?.(error as Error);
    throw error;
  }
}

export async function generateAIPlan(data: any) {
  return apiRequest('/api/aria/generate-plan', { method: 'POST', data });
}

// Races
export async function getRaces() {
  return apiRequest('/api/races');
}

export async function createRace(data: any) {
  return apiRequest('/api/races', { method: 'POST', data });
}

export async function getRace(id: number) {
  return apiRequest(`/api/races/${id}`);
}

export async function updateRace(id: number, data: any) {
  return apiRequest(`/api/races/${id}`, { method: 'PATCH', data });
}

export async function deleteRace(id: number) {
  return apiRequest(`/api/races/${id}`, { method: 'DELETE' });
}

export async function recordRaceResult(id: number, data: any) {
  return apiRequest(`/api/races/${id}/result`, { method: 'POST', data });
}

// Health check
export async function healthCheck() {
  return apiRequest('/api/health', { skipAuth: true });
}

// Profile Picture Upload
export interface ProfilePictureResponse {
  profileImageUrl: string;
  success: boolean;
}

export async function uploadProfilePicture(imageUri: string): Promise<ProfilePictureResponse> {
  const token = await getToken();

  // Create FormData for multipart upload
  const formData = new FormData();

  // Extract filename from URI
  const filename = imageUri.split('/').pop() || 'profile.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  // @ts-ignore - React Native FormData supports blob-like objects
  formData.append('profileImage', {
    uri: imageUri,
    name: filename,
    type: type,
  });

  const url = `${env.API_BASE_URL}/api/user/public-profile`;

  if (DEBUG_API) {
    console.log(`[API] POST /api/user/public-profile (multipart)`);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      // Note: Don't set Content-Type for FormData, browser will set it with boundary
    },
    body: formData,
  });

  if (DEBUG_API) {
    console.log(`[API] POST /api/user/public-profile -> ${response.status}`);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to upload profile picture');
  }

  const data = await response.json();
  return data as ProfilePictureResponse;
}
