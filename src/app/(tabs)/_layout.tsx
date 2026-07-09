// Native tab bar (real UITabBar / BottomNavigationView, with Liquid Glass on iOS 26).
// Surfaces: Chats and You in a live build, plus Communities and Calls in the offline demo. Icons
// are SF Symbols on iOS, Material Symbols on Android, so no bitmap assets are needed. Communities
// and calls are not wired to the real transport yet, so their tabs are hidden in a live build
// rather than presenting dead surfaces with faked delivery.

import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { BACKEND_ENABLED } from '@/net/config';

export default function TabsLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf="bubble.left.and.bubble.right.fill" md="chat" />
        <NativeTabs.Trigger.Label>Chats</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="communities" hidden={BACKEND_ENABLED}>
        <NativeTabs.Trigger.Icon sf="person.3.fill" md="groups" />
        <NativeTabs.Trigger.Label>Communities</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="calls" hidden={BACKEND_ENABLED}>
        <NativeTabs.Trigger.Icon sf="phone.fill" md="call" />
        <NativeTabs.Trigger.Label>Calls</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="you">
        <NativeTabs.Trigger.Icon sf="person.crop.circle.fill" md="account_circle" />
        <NativeTabs.Trigger.Label>You</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
