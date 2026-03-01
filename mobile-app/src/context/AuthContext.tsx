import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  getCurrentUser,
  updateUser as apiUpdateUser,
  completeOnboarding as apiCompleteOnboarding,
  uploadProfilePicture as apiUploadProfilePicture,
  LoginInput,
  RegisterInput,
} from '../lib/api';
import {
  clearAuthStorage,
  debugAuthStorage,
  getStoredUser,
  getToken,
  setStoredUser,
  setToken,
} from '../lib/tokenStorage';

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
  weeklyGoalDistance: null,
  weeklyGoalDuration: null,
  onboardingCompleted: true,
});

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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
      const token = await getToken();

      if (!token) {
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
      await setStoredUser(resolvedUser);
      return true;
    } catch (error) {
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
      return false;
    }
  }, []);

  useEffect(() => {
    debugAuthStorage();
    fetchUser();
  }, [fetchUser]);

  const login = useCallback(async (input: LoginInput) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await apiLogin(input);
      if (!response.token) {
        throw new Error('Missing auth token');
      }
      await setToken(response.token);
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
    if (state.isDemoMode) {
      // Update profile locally in demo mode
      const newProfile = { ...state.profile, ...data } as UserProfile;
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
      setState((prev) => ({
        ...prev,
        profile: response.profile ?? prev.profile,
      }));
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        error: error.message || 'Failed to update profile',
      }));
      throw error;
    }
  }, [state.isDemoMode, state.profile]);

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
    if (state.isDemoMode) {
      // In demo mode, just update locally with the local URI
      const newProfile = { ...state.profile, photoUrl: imageUri } as UserProfile;
      await AsyncStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(newProfile));
      setState((prev) => ({
        ...prev,
        profile: newProfile,
      }));
      return;
    }

    try {
      const response = await apiUploadProfilePicture(imageUri);

      // Update profile with new photo URL from Azure Blob
      const newProfile = { ...state.profile, photoUrl: response.profileImageUrl } as UserProfile;
      setState((prev) => ({
        ...prev,
        profile: newProfile,
      }));
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        error: error.message || 'Failed to upload profile picture',
      }));
      throw error;
    }
  }, [state.isDemoMode, state.profile]);

  const completeOnboarding = useCallback(async () => {
    if (state.isDemoMode) {
      // Complete onboarding locally in demo mode
      const newProfile = { ...state.profile, onboardingCompleted: true } as UserProfile;
      await AsyncStorage.setItem(DEMO_PROFILE_KEY, JSON.stringify(newProfile));
      setState((prev) => ({
        ...prev,
        profile: newProfile,
      }));
      return;
    }

    try {
      const response = await apiCompleteOnboarding() as { profile?: UserProfile };
      setState((prev) => ({
        ...prev,
        profile: response.profile ?? prev.profile,
      }));
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        error: error.message || 'Failed to complete onboarding',
      }));
      throw error;
    }
  }, [state.isDemoMode, state.profile]);

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
