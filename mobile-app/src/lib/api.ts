import { env } from '../config/env';
import { getToken, setToken, getRefreshToken, setRefreshToken, clearAuthStorage } from './tokenStorage';
import EventSource from 'react-native-sse';

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

export interface GoogleSignInInput {
  idToken: string;
}

export async function appleSignIn(input: AppleSignInInput): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/api/auth/apple', {
    method: 'POST',
    data: input,
    skipAuth: true,
  });
}

export async function googleSignIn(input: GoogleSignInInput): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/api/auth/google', {
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

export async function getTodaysWorkouts() {
  return apiRequest('/api/workouts/today-all');
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
export async function getCompletedSessions() {
  return apiRequest('/api/sessions');
}

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
  onComplete?: (conversationId?: number) => void,
  onError?: (error: Error) => void
): Promise<void> {
  const token = await getToken();
  const url = `${env.MOBILE_BACKEND_BASE_URL || env.API_BASE_URL}/api/aria/chat`;

  if (DEBUG_API) {
    console.log('[API] POST /api/aria/chat (streaming via SSE)');
  }

  return new Promise<void>((resolve, reject) => {
    let conversationId: number | undefined;

    const es = new EventSource<'message'>(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      method: 'POST',
      body: JSON.stringify({ ...input, stream: true }),
    });

    es.addEventListener('message', (event: any) => {
      const data = event.data;
      if (!data) return;

      if (data === '[DONE]') {
        if (DEBUG_API) {
          console.log('[API] Received [DONE] signal');
        }
        es.close();
        onComplete?.(conversationId);
        resolve();
        return;
      }

      try {
        const parsed = JSON.parse(data);

        if (parsed.type === 'metadata') {
          conversationId = parsed.conversationId;
          if (DEBUG_API) {
            console.log('[API] Stream metadata, conversationId:', conversationId);
          }
        } else if (parsed.type === 'chunk' && parsed.content) {
          onChunk(parsed.content);
        } else if (parsed.type === 'error') {
          es.close();
          const err = new Error(parsed.message || 'Streaming error');
          onError?.(err);
          reject(err);
        }
      } catch {
        // If not JSON, treat as plain text chunk
        onChunk(data);
      }
    });

    es.addEventListener('error', (event: any) => {
      if (DEBUG_API) {
        console.error('[API] SSE error:', event);
      }
      es.close();
      const err = new Error(event?.message || 'SSE connection failed');
      onError?.(err);
      reject(err);
    });
  });
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

export async function createProgramSession(programId: number, data: any) {
  return apiRequest(`/api/programs/${programId}/sessions`, { method: 'POST', data });
}

export async function updateProgramSession(programId: number, sessionId: number, data: any) {
  return apiRequest(`/api/programs/${programId}/sessions/${sessionId}`, { method: 'PATCH', data });
}

export async function deleteProgramSession(programId: number, sessionId: number) {
  return apiRequest(`/api/programs/${programId}/sessions/${sessionId}`, { method: 'DELETE' });
}

export async function bulkUpsertSessions(programId: number, sessions: any[]) {
  return apiRequest(`/api/programs/${programId}/sessions`, { method: 'PUT', data: { sessions } });
}

// ==================== PUSH NOTIFICATIONS ====================

export async function registerPushToken(token: string) {
  return apiRequest('/api/push-token', { method: 'POST', data: { token } });
}

// Sprint Workout Logging
export async function logSprintWorkout(data: {
  title: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  notes?: string;
  splits: Array<{
    exerciseName: string;
    repTimes: number[];
    notes?: string;
  }>;
}) {
  return apiRequest('/api/workouts', {
    method: 'POST',
    data: { ...data, type: 'sprint_log', providerSource: 'manual' },
  });
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
  const extension = match?.[1]?.toLowerCase();
  const mimeTypeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
  };
  const type = extension ? (mimeTypeMap[extension] || `image/${extension}`) : 'image/jpeg';

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

export interface VoiceTranscriptionResponse {
  text: string;
  confidence?: number;
  metadata?: Record<string, any>;
  success?: boolean;
}

const audioMimeTypeMap: Record<string, string> = {
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  caf: 'audio/x-caf',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  webm: 'audio/webm',
};

const inferAudioMimeType = (uri: string): string => {
  const filename = uri.split('/').pop() || 'recording.m4a';
  const match = /\.(\w+)$/.exec(filename);
  const extension = match?.[1]?.toLowerCase();
  if (!extension) return 'audio/mp4';
  return audioMimeTypeMap[extension] || `audio/${extension}`;
};

export async function transcribeVoiceAudio(
  audioUri: string,
  language = 'en-US'
): Promise<VoiceTranscriptionResponse> {
  const token = await getToken();
  const safeLanguage = encodeURIComponent(language);
  const baseUrl = env.AI_API_BASE_URL;

  const endpointCandidates = [
    `${baseUrl}/voice/transcribe?language=${safeLanguage}`,
    `${baseUrl}/api/v1/voice/transcribe?language=${safeLanguage}`,
  ];

  let lastError = 'Failed to transcribe audio';

  const buildFormData = () => {
    const filename = audioUri.split('/').pop() || 'recording.m4a';
    const formData = new FormData();
    // @ts-ignore - React Native FormData supports blob-like objects
    formData.append('audio', {
      uri: audioUri,
      name: filename,
      type: inferAudioMimeType(audioUri),
    });
    return formData;
  };

  for (const url of endpointCandidates) {
    if (DEBUG_API) {
      console.log(`[API] POST ${url}`);
    }

    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: buildFormData(),
      });

      const text = await response.text();
      let payload: any = null;
      try {
        payload = text ? JSON.parse(text) : null;
      } catch {
        payload = null;
      }

      if (!response.ok) {
        const message = payload?.detail || payload?.error || text || `HTTP ${response.status}`;
        lastError = typeof message === 'string' ? message : JSON.stringify(message);
        if (DEBUG_API) {
          console.log(`[API] Transcription failed ${response.status}:`, lastError);
        }
        // try next candidate only if route is missing
        if (response.status === 404) {
          continue;
        }
        throw new Error(lastError);
      }

      const transcriptText =
        typeof payload?.text === 'string'
          ? payload.text
          : typeof payload?.transcript === 'string'
            ? payload.transcript
            : '';

      if (!transcriptText.trim()) {
        throw new Error('No speech detected in recording');
      }

      return {
        text: transcriptText,
        confidence: payload?.confidence,
        metadata: payload?.metadata,
        success: payload?.success ?? true,
      };
    } catch (error: any) {
      lastError = error?.message || lastError;
      if (url === endpointCandidates[endpointCandidates.length - 1]) {
        throw new Error(lastError);
      }
    }
  }

  throw new Error(lastError);
}
