import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { registerPushToken } from '../lib/api';

let Notifications: typeof import('expo-notifications') | null = null;
let Device: typeof import('expo-device') | null = null;

try {
  Notifications = require('expo-notifications');
} catch {
  console.warn('[Notifications] expo-notifications native module not available');
}

try {
  Device = require('expo-device');
} catch {
  console.warn('[Notifications] expo-device native module not available');
}

// Configure how notifications appear when app is in foreground
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Notifications) return null;
  if (Device && !Device.isDevice) {
    console.log('[Notifications] Must use physical device for push notifications');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Notifications] Permission not granted');
    return null;
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;
    console.log('[Notifications] Push token:', token);

    // Register token with backend
    try {
      await registerPushToken(token);
    } catch (error) {
      console.error('[Notifications] Failed to register token with backend:', error);
    }

    return token;
  } catch (error) {
    console.error('[Notifications] Failed to get push token:', error);
    return null;
  }
}

export function setupNotificationListeners() {
  if (!Notifications) return () => {};

  // Handle notification received while app is in foreground
  const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
    console.log('[Notifications] Received:', notification.request.content.title);
  });

  // Handle user tapping on a notification
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    console.log('[Notifications] Tapped:', data);

    const screen = data?.screen as string | undefined;
    if (screen === 'chat') router.push('/(tabs)/chat');
    else if (screen === 'nutrition-log') router.push('/nutrition-log');
    else if (screen === 'settings') router.push('/settings/notifications');
  });

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}

export async function scheduleLocalNotification(
  title: string,
  body: string,
  trigger: any,
  data?: Record<string, unknown>
): Promise<string> {
  if (!Notifications) return '';
  return Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: 'default' },
    trigger,
  });
}

export async function cancelAllScheduledNotifications(): Promise<void> {
  if (!Notifications) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
