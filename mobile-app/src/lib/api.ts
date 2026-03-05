import { env } from '../config/env';
import { getToken, setToken, getRefreshToken, setRefreshToken, clearAuthStorage } from './tokenStorage';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  data?: unknown;
  headers?: Record<string, string>;
  rawResponse?: boolean;
  skipAuth?: boolean;
  _isRetry?: boolean;
}

const defaultHeaders = {
  Accept: 'application/json',
};

const DEBUG_API = __DEV__;

// Mutex to prevent concurrent refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function attemptTokenRefresh(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return false;

      const baseUrl = env.MOBILE_BACKEND_BASE_URL || env.API_BASE_URL;
      const response = await fetch(`${baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        await clearAuthStorage();
        return false;
      }

      const data = await response.json();
      if (data.token) {
        await setToken(data.token);
      }
      if (data.refreshToken) {
        await setRefreshToken(data.refreshToken);
      }

      if (DEBUG_API) {
        console.log('[API] Token refreshed successfully');
      }
      return true;
    } catch (error) {
      if (DEBUG_API) {
        console.log('[API] Token refresh failed:', error);
      }
      await clearAuthStorage();
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiRequest<T = any>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', data, headers, rawResponse, skipAuth, _isRetry } = options;
  const baseUrl = env.MOBILE_BACKEND_BASE_URL || env.API_BASE_URL;
  const url = path.startsWith('http') ? path : `${baseUrl}${path}`;

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
      baseUrl,
      aiBaseUrl: env.AI_API_BASE_URL,
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
      // Auto-refresh on 401 (expired access token), but only once
      if (response.status === 401 && !skipAuth && !_isRetry) {
        const refreshed = await attemptTokenRefresh();
        if (refreshed) {
          return apiRequest<T>(path, { ...options, _isRetry: true });
        }
      }

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

    if (DEBUG_API && path.includes('/api/aria/chat')) {
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
  email: string;
  password: string;
}

export interface LoginResponse {
  id: number | string;
  username?: string;
  email?: string;
  token: string;
  refreshToken?: string;
}

export interface RegisterResponse {
  user: any;
  token: string;
  refreshToken?: string;
  requiresOnboarding?: boolean;
}

export async function register(input: RegisterInput): Promise<RegisterResponse> {
  return apiRequest<RegisterResponse>('/api/auth/register', {
    method: 'POST',
    data: input,
    skipAuth: true,
  });
}

export async function login(input: LoginInput): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    data: input,
    skipAuth: true,
  });
}

export async function logout(): Promise<void> {
  await apiRequest('/api/auth/logout', { method: 'POST', rawResponse: true });
}

export interface AppleSignInInput {
  identityToken: string;
  authorizationCode: string;
  user?: {
    email?: string;
    name?: {
      firstName?: string;
      lastName?: string;
    };
  };
}

export async function appleSignIn(input: AppleSignInInput): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/api/auth/apple', {
    method: 'POST',
    data: input,
    skipAuth: true,
  });
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
  return apiRequest('/api/aria/conversations');
}

export async function createConversation(title?: string) {
  return apiRequest('/api/aria/conversations', { method: 'POST', data: { title } });
}

export async function getConversationMessages(conversationId: number) {
  return apiRequest(`/api/aria/conversations/${conversationId}/messages`);
}

export async function deleteConversation(conversationId: number) {
  return apiRequest(`/api/aria/conversations/${conversationId}`, { method: 'DELETE' });
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
  return apiRequest('/api/aria/chat', { method: 'POST', data: input });
}

// Streaming Chat
export async function sendChatMessageStream(
  input: ChatInput,
  onChunk: (text: string) => void,
  onComplete?: () => void,
  onError?: (error: Error) => void
): Promise<void> {
  const token = await getToken();
  const url = `${env.MOBILE_BACKEND_BASE_URL || env.API_BASE_URL}/api/aria/chat`;

  if (DEBUG_API) {
    console.log('[API] POST /api/aria/chat (streaming)');
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

// ==================== NUTRITION PLANS ====================

export async function getNutritionPlans() {
  return apiRequest('/api/nutrition/plans');
}

export async function createNutritionPlan(data: any) {
  return apiRequest('/api/nutrition/plans', { method: 'POST', data });
}

export async function getNutritionPlan(id: number) {
  return apiRequest(`/api/nutrition/plans/${id}`);
}

export async function updateNutritionPlan(id: number, data: any) {
  return apiRequest(`/api/nutrition/plans/${id}`, { method: 'PATCH', data });
}

export async function deleteNutritionPlan(id: number) {
  return apiRequest(`/api/nutrition/plans/${id}`, { method: 'DELETE' });
}

export async function generateNutritionPlan(data: any) {
  return apiRequest('/api/nutrition/generate', { method: 'POST', data });
}

// ==================== PROGRAMS ====================

export async function getPrograms() {
  return apiRequest('/api/programs');
}

export async function createProgram(data: any) {
  return apiRequest('/api/programs', { method: 'POST', data });
}

export async function getProgram(id: number) {
  return apiRequest(`/api/programs/${id}`);
}

export async function updateProgram(id: number, data: any) {
  return apiRequest(`/api/programs/${id}`, { method: 'PATCH', data });
}

export async function deleteProgram(id: number) {
  return apiRequest(`/api/programs/${id}`, { method: 'DELETE' });
}

export async function uploadProgramFile(formData: FormData) {
  const token = await getToken();
  const url = `${env.MOBILE_BACKEND_BASE_URL || env.API_BASE_URL}/api/programs/upload`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to upload program file');
  }

  return response.json();
}

export async function importGoogleSheet(data: { title: string; googleSheetUrl: string; description?: string }) {
  return apiRequest('/api/programs/import-sheet', { method: 'POST', data });
}

export async function generateProgram(data: any) {
  return apiRequest('/api/programs/generate', { method: 'POST', data });
}

export async function getProgramTemplateCSV() {
  return apiRequest('/api/programs/templates', { rawResponse: true });
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

  const url = `${env.MOBILE_BACKEND_BASE_URL || env.API_BASE_URL}/api/user/public-profile`;

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
