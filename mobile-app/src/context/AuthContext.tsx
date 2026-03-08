import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
  useCallback,
} from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  getCurrentUser,
  updateUser as apiUpdateUser,
  completeOnboarding as apiCompleteOnboarding,
  uploadProfilePicture as apiUploadProfilePicture,
  appleSignIn as apiAppleSignIn,
  googleSignIn as apiGoogleSignIn,
  LoginInput,
  RegisterInput,
  AppleSignInInput,
  GoogleSignInInput,
} from '../lib/api';
import {
  clearAuthStorage,
  debugAuthStorage,
  getRefreshToken,
  getStoredProfile,
  getStoredUser,
  getToken,
  setStoredProfile,
  setStoredUser,
  setToken,
  setRefreshToken,
} from '../lib/tokenStorage';
import {
  getLocalProfileImageUri,
  saveProfileImageLocally,
} from '../lib/profileImageCache';
import { registerForPushNotifications } from '../services/notifications';

// Demo mode storage key
const DEMO_MODE_KEY = 'aria_demo_mode';
const DEMO_PROFILE_KEY = 'aria_demo_profile';

export interface User {
  id: number | string;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  token?: string;
  subscriptionTier?: string | null;
  sprinthiaPrompts?: number | null;
}

export interface UserProfile {
  id?: number;
  userId?: number;
  displayName: string | null;
  photoUrl?: string | null;
  sport: string | null;
  experienceLevel: string | null;
  goalTags?: string[];
  units: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  height?: number | null;
  weight?: number | null;
  country?: string | null;
  activityLevel?: string | null;
  bodyFatPercentage?: number | null;
  dietaryRestrictions?: string[] | null;
  foodPreferences?: Record<string, any> | null;
  injuryHistory?: string | null;
  weeklyGoalDistance?: number | null;
  weeklyGoalDuration?: number | null;
  onboardingCompleted: boolean;
}

export interface UserPreferences {
  id?: number;
  userId?: number;
  notificationPrefs?: {
    workoutReminders: boolean;
    dailyDigest: boolean;
    weeklyReport: boolean;
    coachingTips: boolean;
    competitionAlerts: boolean;
    missedWorkout?: boolean;
    restDay?: boolean;
    fatigue?: boolean;
    prPredictions?: boolean;
    mealReminders?: boolean;
    hydration?: boolean;
    quietHoursEnabled?: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
  };
  privacyPrefs?: {
    shareWorkouts: boolean;
    publicProfile: boolean;
    dataAnalytics: boolean;
  };
  aiCoachingStyle?: string;
  preferredWorkoutDays?: string[];
  preferredWorkoutTime?: string | null;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  preferences: UserPreferences | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  isDemoMode: boolean;
  hasValidToken: boolean;
}

interface AuthContextType extends AuthState {
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  appleLogin: (input: AppleSignInInput) => Promise<void>;
  googleLogin: (input: GoogleSignInInput) => Promise<void>;
  demoLogin: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  updatePreferences: (data: Partial<UserPreferences>) => Promise<void>;
  uploadProfilePicture: (imageUri: string) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

// Demo user data for testing without server
const createDemoUser = (): User => ({
  id: 'guest',
  name: 'Demo User',
  username: 'demo',
  email: 'demo@aria.app',
});

const createDemoProfile = (existingProfile?: Partial<UserProfile>): UserProfile => ({
  displayName: existingProfile?.displayName || null,
  photoUrl: null,
  sport: existingProfile?.sport || null,
  experienceLevel: existingProfile?.experienceLevel || null,
  goalTags: existingProfile?.goalTags || [],
  units: 'imperial',
  dateOfBirth: null,
  gender: null,
  height: null,
  weight: null,
  country: null,
  activityLevel: null,
  bodyFatPercentage: null,
  dietaryRestrictions: null,
  foodPreferences: null,
  injuryHistory: null,
  weeklyGoalDistance: null,
  weeklyGoalDuration: null,
  onboardingCompleted: existingProfile?.onboardingCompleted || false,
});

const createDemoPreferences = (): UserPreferences => ({
  notificationPrefs: {
    workoutReminders: true,
    dailyDigest: true,
    weeklyReport: true,
    coachingTips: true,
    competitionAlerts: true,
  },
  privacyPrefs: {
    shareWorkouts: false,
    publicProfile: false,
    dataAnalytics: true,
  },
  aiCoachingStyle: 'balanced',
  preferredWorkoutDays: ['monday', 'wednesday', 'friday', 'saturday'],
  preferredWorkoutTime: 'morning',
});

const createDefaultProfile = (user?: User | null): UserProfile => ({
  displayName:
    user?.name ||
    user?.username ||
    user?.email ||
    'Athlete',
  photoUrl: null,
  sport: null,
  experienceLevel: null,
  goalTags: [],
  units: 'imperial',
  dateOfBirth: null,
  gender: null,
  height: null,
  weight: null,
  country: null,
  activityLevel: null,
  bodyFatPercentage: null,
  dietaryRestrictions: null,
  foodPreferences: null,
  injuryHistory: null,
  weeklyGoalDistance: null,
  weeklyGoalDuration: null,
  onboardingCompleted: true,
});

const hydrateProfileWithLocalPhoto = (
  profile: UserProfile | null,
  localPhotoUri: string | null
): UserProfile | null => {
  if (!profile || !localPhotoUri) {
    return profile;
  }

  return {
    ...profile,
    photoUrl: localPhotoUri,
  };
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const lastFetchedAt = useRef<number>(0);
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    preferences: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
    isDemoMode: false,
    hasValidToken: false,
  });

  const fetchUser = useCallback(async (): Promise<boolean> => {
    try {
      const [token, refreshToken] = await Promise.all([
        getToken(),
        getRefreshToken(),
      ]);

      if (!token && !refreshToken) {
        const storedUser = await getStoredUser<User>();
        if (storedUser && storedUser.id === 'guest') {
          setState((prev) => ({
            ...prev,
            user: storedUser,
            hasValidToken: false,
            isAuthenticated: true,
            isLoading: false,
          }));
          return true;
        }

        setState((prev) => ({
          ...prev,
          user: null,
          profile: null,
          preferences: null,
          hasValidToken: false,
          isAuthenticated: false,
          isLoading: false,
        }));
        return false;
      }

      const data = await getCurrentUser();
      const response = data as { user?: User; profile?: UserProfile; preferences?: UserPreferences };
      const resolvedUser = response.user ?? (data as User);
      const resolvedProfile = response.profile ?? createDefaultProfile(resolvedUser);
      const resolvedPreferences = response.preferences ?? null;

      setState((prev) => ({
        ...prev,
        user: resolvedUser,
        profile: resolvedProfile,
        preferences: resolvedPreferences,
        isAuthenticated: true,
        isLoading: false,
        isDemoMode: false,
        hasValidToken: true,
      }));
      if (__DEV__) {
        console.log('[Auth] sprinthia status', {
          subscriptionTier: resolvedUser?.subscriptionTier,
          sprinthiaPrompts: resolvedUser?.sprinthiaPrompts,
        });
      }
      await Promise.all([
        setStoredUser(resolvedUser),
        setStoredProfile(resolvedProfile),
      ]);
      if (resolvedProfile.photoUrl) {
        // Download the server photo to local cache. Once cached, update the
        // profile in state + storage so cold starts use the local file URI
        // instead of an expiring SAS/proxy URL.
        saveProfileImageLocally(resolvedProfile.photoUrl, token)
          .then((localUri) => {
            const localProfile = { ...resolvedProfile, photoUrl: localUri };
            setState((prev) => {
              // Only update if the profile hasn't been changed by another action
              // (e.g., user uploaded a new photo in the meantime).
              if (prev.profile?.photoUrl === resolvedProfile.photoUrl) {
                return { ...prev, profile: localProfile };
              }
              return prev;
            });
            setStoredProfile(localProfile).catch(() => {});
          })
          .catch((cacheError) => {
            console.warn('[Auth] Failed to refresh local profile image cache:', cacheError);
          });
      }
      lastFetchedAt.current = Date.now();

      // Register for push notifications (non-blocking)
      registerForPushNotifications().catch(err => console.error('[Auth] Push registration failed:', err));

      return true;
    } catch (error: any) {
      // Only clear auth on 401 (invalid token). Network errors should preserve cached state.
      if (error?.status === 401) {
        await clearAuthStorage();
        setState((prev) => ({
          ...prev,
          user: null,
          profile: null,
          preferences: null,
          isAuthenticated: false,
          isLoading: false,
          hasValidToken: false,
        }));
      } else {
        // Network error or server error — keep cached profile intact
        if (__DEV__) {
          console.log('[Auth] fetchUser failed (non-401), keeping cached state:', error?.message);
        }
        setState((prev) => ({ ...prev, isLoading: false }));
      }
      return false;
    }
  }, []);

  useEffect(() => {
    debugAuthStorage();

    let isActive = true;

    const bootstrapAuth = async () => {
      const [token, storedUser, storedProfile, localProfileImageUri] = await Promise.all([
        getToken(),
        getStoredUser<User>(),
        getStoredProfile<UserProfile>(),
        getLocalProfileImageUri(),
      ]);

      if (
        isActive &&
        token &&
        (storedUser || storedProfile)
      ) {
        const cachedProfile = storedProfile ?? createDefaultProfile(storedUser);
        setState((prev) => ({
          ...prev,
          user: storedUser ?? prev.user,
          profile: hydrateProfileWithLocalPhoto(cachedProfile, localProfileImageUri),
          isAuthenticated: true,
          isLoading: true,
          isDemoMode: false,
          hasValidToken: true,
        }));
      }

      await fetchUser();
    };

    bootstrapAuth();

    return () => {
      isActive = false;
    };
  }, [fetchUser]);

  // Refresh user data when app comes to foreground (if stale >1 hour)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && state.isAuthenticated && !state.isDemoMode) {
        const hoursSinceLastFetch = (Date.now() - lastFetchedAt.current) / (1000 * 60 * 60);
        if (hoursSinceLastFetch > 1) {
          fetchUser();
        }
      }
    });
    return () => subscription.remove();
  }, [state.isAuthenticated, state.isDemoMode, fetchUser]);

  const login = useCallback(async (input: LoginInput) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await apiLogin(input);
      if (!response.token) {
        throw new Error('Missing auth token');
      }
      await setToken(response.token);
      if (response.refreshToken) {
        await setRefreshToken(response.refreshToken);
      }
      const ok = await fetchUser();
      if (!ok) {
        throw new Error('Login failed. Please try again.');
      }
      setState((prev) => ({ ...prev, error: null, isLoading: false }));
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Login failed',
        hasValidToken: false,
      }));
      throw error;
    }
  }, [fetchUser]);

  const register = useCallback(async (input: RegisterInput) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await apiRegister(input);
      if (!response.token) {
        throw new Error('Missing auth token');
      }
      await setToken(response.token);
      if (response.refreshToken) {
        await setRefreshToken(response.refreshToken);
      }
      const ok = await fetchUser();
      if (!ok) {
        throw new Error('Registration failed. Please try again.');
      }
      setState((prev) => ({ ...prev, error: null, isLoading: false }));
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Registration failed',
        hasValidToken: false,
      }));
      throw error;
    }
  }, [fetchUser]);

  const appleLogin = useCallback(async (input: AppleSignInInput) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await apiAppleSignIn(input);
      if (!response.token) {
        throw new Error('Missing auth token');
      }
      await setToken(response.token);
      if (response.refreshToken) {
        await setRefreshToken(response.refreshToken);
      }
      const ok = await fetchUser();
      if (!ok) {
        throw new Error('Apple Sign In failed. Please try again.');
      }
      setState((prev) => ({ ...prev, error: null, isLoading: false }));
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Apple Sign In failed',
        hasValidToken: false,
      }));
      throw error;
    }
  }, [fetchUser]);

  const googleLogin = useCallback(async (input: GoogleSignInInput) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await apiGoogleSignIn(input);
      if (!response.token) {
        throw new Error('Missing auth token');
      }
      await setToken(response.token);
      if (response.refreshToken) {
        await setRefreshToken(response.refreshToken);
      }
      const ok = await fetchUser();
      if (!ok) {
        throw new Error('Google Sign In failed. Please try again.');
      }
      setState((prev) => ({ ...prev, error: null, isLoading: false }));
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Google Sign In failed',
        hasValidToken: false,
      }));
      throw error;
    }
  }, [fetchUser]);

  // Demo login - works without server connection
  const demoLogin = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      await AsyncStorage.setItem(DEMO_MODE_KEY, 'true');
      setState({
        user: createDemoUser(),
        profile: createDemoProfile(),
        preferences: createDemoPreferences(),
        isAuthenticated: true,
        isLoading: false,
        error: null,
        isDemoMode: true,
        hasValidToken: false,
      });
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Demo login failed',
      }));
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      if (state.isDemoMode) {
        await AsyncStorage.removeItem(DEMO_MODE_KEY);
        await AsyncStorage.removeItem(DEMO_PROFILE_KEY);
      } else {
        try {
          await apiLogout();
        } catch (error) {
          // Logout endpoint failure is non-fatal
        }
      }
    } finally {
      await clearAuthStorage();
      setState({
        user: null,
        profile: null,
        preferences: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        isDemoMode: false,
        hasValidToken: false,
      });
    }
  }, [state.isDemoMode]);

  const updateProfile = useCallback(async (data: Partial<UserProfile>) => {
    const baseProfile = state.profile ?? createDefaultProfile(state.user);

    if (state.isDemoMode) {
      // Update profile locally in demo mode
      const newProfile = { ...baseProfile, ...data } as UserProfile;
      await AsyncStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(newProfile));
      setState((prev) => ({
        ...prev,
        profile: newProfile,
      }));
      return;
    }

    try {
      const response = await apiUpdateUser({ profile: data }) as {
        profile?: UserProfile;
        preferences?: UserPreferences;
      };
      const nextProfile = response.profile ?? ({ ...baseProfile, ...data } as UserProfile);
      setState((prev) => ({
        ...prev,
        profile: nextProfile,
      }));
      await setStoredProfile(nextProfile);
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        error: error.message || 'Failed to update profile',
      }));
      throw error;
    }
  }, [state.isDemoMode, state.profile, state.user]);

  const updatePreferences = useCallback(async (data: Partial<UserPreferences>) => {
    try {
      const response = await apiUpdateUser({ preferences: data }) as {
        profile?: UserProfile;
        preferences?: UserPreferences;
      };
      setState((prev) => ({
        ...prev,
        preferences: response.preferences ?? prev.preferences,
      }));
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        error: error.message || 'Failed to update preferences',
      }));
      throw error;
    }
  }, []);

  const uploadProfilePicture = useCallback(async (imageUri: string) => {
    const baseProfile = state.profile ?? createDefaultProfile(state.user);

    if (state.isDemoMode) {
      // In demo mode, just update locally with the local URI
      const newProfile = { ...baseProfile, photoUrl: imageUri } as UserProfile;
      await AsyncStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(newProfile));
      setState((prev) => ({
        ...prev,
        profile: newProfile,
      }));
      return;
    }

    try {
      const localPhotoUri = await saveProfileImageLocally(imageUri);
      const optimisticProfile = { ...baseProfile, photoUrl: localPhotoUri } as UserProfile;
      setState((prev) => ({
        ...prev,
        profile: optimisticProfile,
      }));
      await setStoredProfile(optimisticProfile);

      const response = await apiUploadProfilePicture(imageUri);
      // Upload confirmed. Keep the durable local file URI for display and
      // storage instead of the transient SAS/proxy URL from the server,
      // which will expire and break on cold start.
      const _serverUrl = response.photoUrl ?? response.profileImageUrl;
      if (__DEV__) {
        console.log('[Auth] Photo uploaded, server URL:', _serverUrl?.substring(0, 80));
        console.log('[Auth] Keeping local URI for display:', localPhotoUri);
      }
      // optimisticProfile already has localPhotoUri -- no state change needed.
      // Stored profile already persisted above with localPhotoUri.
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        error: error.message || 'Failed to upload profile picture',
      }));
      throw error;
    }
  }, [state.isDemoMode, state.profile, state.user]);

  const completeOnboarding = useCallback(async () => {
    const baseProfile = state.profile ?? createDefaultProfile(state.user);

    if (state.isDemoMode) {
      // Complete onboarding locally in demo mode
      const newProfile = { ...baseProfile, onboardingCompleted: true } as UserProfile;
      await AsyncStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(newProfile));
      setState((prev) => ({
        ...prev,
        profile: newProfile,
      }));
      return;
    }

    try {
      const response = await apiCompleteOnboarding() as { profile?: UserProfile };
      const nextProfile = response.profile ?? ({
        ...baseProfile,
        onboardingCompleted: true,
      } as UserProfile);
      setState((prev) => ({
        ...prev,
        profile: nextProfile,
      }));
      await setStoredProfile(nextProfile);
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        error: error.message || 'Failed to complete onboarding',
      }));
      throw error;
    }
  }, [state.isDemoMode, state.profile, state.user]);

  const refreshUser = useCallback(async () => {
    try {
      await fetchUser();
    } catch (error: any) {
      console.error('Failed to refresh user:', error);
    }
  }, [fetchUser]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        appleLogin,
        googleLogin,
        demoLogin,
        logout,
        updateProfile,
        updatePreferences,
        uploadProfilePicture,
        completeOnboarding,
        refreshUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
