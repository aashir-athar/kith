// Remote push registration and tap routing. A local notification only fires while the app runs;
// to reach a backgrounded or force-quit app the OS must deliver a remote push (APNs / FCM), which
// the relay sends at message time. Here we mint the device's Expo push token and hand it to the
// relay, and route to the conversation when a notification is tapped.

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import { api } from '@/api/client';

// Foreground arrivals are already shown by the in-app UI, so suppress the banner to avoid a double.
// Background and force-quit arrivals are displayed by the OS directly (this handler is not consulted
// then), which is what delivers a notification while the app is killed.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

function resolveProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;
}

/** Ask for permission, mint an Expo push token, and register it so the relay can wake this device
 * when it is not connected. Safe to call on every launch; a no-op on simulators or without EAS. */
export async function registerForPush(authToken: string): Promise<void> {
  if (!Device.isDevice) return; // remote push is not delivered to simulators
  const existing = await Notifications.getPermissionsAsync();
  const status = existing.granted ? existing.status : (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  const projectId = resolveProjectId();
  if (!projectId) return; // set by `eas init`; without it Expo cannot mint a token

  try {
    const { data: pushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
    await api.registerPush(authToken, pushToken, Platform.OS);
  } catch {
    // offline, denied at the OS level, or push unsupported in this build: skip silently
  }
}

/** Route to the conversation when the user taps a message notification. Returns an unsubscribe. */
export function addNotificationTapHandler(resolveLocalId: (serverConversationId: string) => string | undefined): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as { conversationId?: string } | undefined;
    const serverId = data?.conversationId;
    if (!serverId) return;
    const localId = resolveLocalId(serverId);
    if (localId) router.push({ pathname: '/conversation/[id]', params: { id: localId } });
  });
  return () => sub.remove();
}
