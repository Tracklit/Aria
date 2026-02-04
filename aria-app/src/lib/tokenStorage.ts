import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@aria_auth_token';
const USER_KEY = '@aria_user';

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
  await Promise.all([AsyncStorage.removeItem(TOKEN_KEY), AsyncStorage.removeItem(USER_KEY)]);
};

export const debugAuthStorage = async (): Promise<void> => {
  if (!DEBUG_TOKEN) return;
  const [token, user] = await Promise.all([
    AsyncStorage.getItem(TOKEN_KEY),
    AsyncStorage.getItem(USER_KEY),
  ]);
  console.log('[TOKEN] debug storage', {
    hasToken: !!token,
    user: user ? JSON.parse(user) : null,
  });
};
