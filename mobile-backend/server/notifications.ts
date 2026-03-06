interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
}

export async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<boolean> {
  const message: ExpoPushMessage = {
    to: pushToken,
    title,
    body,
    data,
    sound: 'default',
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json() as { data?: { status?: string; message?: string } };
    if (result.data?.status === 'error') {
      console.error('Push notification error:', result.data.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Failed to send push notification:', error);
    return false;
  }
}

export async function sendBulkNotifications(
  pushTokens: string[],
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  const messages: ExpoPushMessage[] = pushTokens.map(token => ({
    to: token,
    title,
    body,
    data,
    sound: 'default',
  }));

  // Expo recommends batches of 100
  const chunks: ExpoPushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(chunk),
      });
    } catch (error) {
      console.error('Failed to send batch notifications:', error);
    }
  }
}
