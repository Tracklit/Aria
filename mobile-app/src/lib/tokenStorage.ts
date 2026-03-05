import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = '@aria_auth_token';
const USER_KEY = '@aria_user';
const REFRESH_TOKEN_KEY = 'aria_refresh_token';

const DEBUG_TOKEN = __DEV__;

export const getToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (DEBUG_TOKEN) {
      console.log(
        '[TOKEN] getToken:',
        token ? `${token.substring(0, 30)}...` : 'null'
      );
    }
    return token;
  } catch (error) {
    console.error('[TOKEN] Error getting token from storage:', error);
    return null;
  }
};

export const setToken = async (token: string): Promise<void> => {
  try {
    if (DEBUG_TOKEN) {
      console.log(
        '[TOKEN] setToken:',
        token ? `${token.substring(0, 30)}...` : 'null'
      );
    }
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error('[TOKEN] Error saving token to storage:', error);
    throw error;
  }
};

export const clearToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error('[TOKEN] Error clearing token from storage:', error);
  }
};

// Refresh token stored in SecureStore (encrypted on device)
export const getRefreshToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('[TOKEN] Error getting refresh token:', error);
    return null;
  }
};

export const setRefreshToken = async (token: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  } catch (error) {
    console.error('[TOKEN] Error saving refresh token:', error);
  }
};

export const clearRefreshToken = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('[TOKEN] Error clearing refresh token:', error);
  }
};

export const getStoredUser = async <T = unknown>(): Promise<T | null> => {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch (error) {
    console.error('[TOKEN] Error getting stored user:', error);
    return null;
  }
};

export const setStoredUser = async (user: unknown): Promise<void> => {
  try {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('[TOKEN] Error saving stored user:', error);
  }
};

export const clearAuthStorage = async (): Promise<void> => {
  await Promise.all([
    AsyncStorage.removeItem(TOKEN_KEY),
    AsyncStorage.removeItem(USER_KEY),
    clearRefreshToken(),
  ]);
};

export const debugAuthStorage = async (): Promise<void> => {
  if (!DEBUG_TOKEN) return;
  const [token, user, refreshToken] = await Promise.all([
    AsyncStorage.getItem(TOKEN_KEY),
    AsyncStorage.getItem(USER_KEY),
    getRefreshToken(),
  ]);
  console.log('[TOKEN] debug storage', {
    hasToken: !!token,
    hasRefreshToken: !!refreshToken,
    user: user ? JSON.parse(user) : null,
  });
};
