import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { registerPushToken } from '../lib/api';

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
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
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: undefined, // Uses the project ID from app.json automatically
    });
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
  // Handle notification received while app is in foreground
  const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
    console.log('[Notifications] Received:', notification.request.content.title);
  });

  // Handle user tapping on a notification
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    const data = response.notification.request.content.data;
    console.log('[Notifications] Tapped:', data);
    // TODO: Deep link based on data.screen / data.route
  });

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}

export async function scheduleLocalNotification(
  title: string,
  body: string,
  trigger: Notifications.NotificationTriggerInput,
  data?: Record<string, unknown>
): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: 'default' },
    trigger,
  });
}

export async function cancelAllScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
