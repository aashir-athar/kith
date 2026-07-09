// Safety number / verification. The number is derived from both identity public keys (this device's
// and the peer's, fetched from their prekey bundle), so comparing it out of band confirms there is
// no one in the middle. Marking verified stores the peer's key; if it later changes, the screen says
// so and clears the verified state. Real cryptography, not a placeholder.

import { useLocalSearchParams } from 'expo-router';
import { fromHex, safetyNumber } from '@kith/shared';
import { ShieldAlert, ShieldCheck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { BackHeader } from '@/components/layout/BackHeader';
import { Screen } from '@/components/layout/Screen';
import { api } from '@/api/client';
import { myIdentityPubHex } from '@/crypto/e2e';
import { Icon } from '@/components/ui/Icon';
import { Surface } from '@/components/ui/Surface';
import { Toggle } from '@/components/ui/Toggle';
import { Text } from '@/components/ui/Text';
import { conversationPeer, conversationTitle } from '@/lib/mockData';
import { BACKEND_ENABLED } from '@/net/config';
import { useChatStore } from '@/stores/useChatStore';
import { useSessionStore } from '@/stores/useSessionStore';
import { useTheme } from '@/theme/ThemeProvider';

export default function VerifyScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const cid = typeof id === 'string' ? id : '';
  const conversation = useChatStore((s) => s.conversations.find((c) => c.id === cid));
  const verifiedKeys = useChatStore((s) => s.verifiedKeys);
  const markVerified = useChatStore((s) => s.markVerified);
  const unmarkVerified = useChatStore((s) => s.unmarkVerified);

  const peer = conversation ? conversationPeer(conversation) : undefined;
  const title = conversation ? conversationTitle(conversation) : 'this chat';

  const [groups, setGroups] = useState<string[] | null>(null);
  const [peerKey, setPeerKey] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const peerUsername = conversation?.peerUsername ?? peer?.username;
  const previouslyVerified = peer ? verifiedKeys[peer.id] : undefined;
  const keyChanged = !!previouslyVerified && !!peerKey && previouslyVerified !== peerKey;
  const isVerified = !!peer && !!peerKey && verifiedKeys[peer.id] === peerKey;

  useEffect(() => {
    let active = true;
    void (async () => {
      const token = useSessionStore.getState().serverToken;
      if (!BACKEND_ENABLED || !token || !peerUsername) {
        if (active) setUnavailable(true);
        return;
      }
      try {
        const [mine, bundle] = await Promise.all([myIdentityPubHex(), api.bundle(token, peerUsername)]);
        if (!active) return;
        if (!mine) {
          setUnavailable(true);
          return;
        }
        setPeerKey(bundle.ikPub);
        setGroups(safetyNumber(fromHex(mine), fromHex(bundle.ikPub)));
      } catch {
        if (active) setUnavailable(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [peerUsername]);

  // If the peer's key changed since it was verified, the old verification no longer holds.
  useEffect(() => {
    if (keyChanged && conversation?.verified && peer) unmarkVerified(cid, peer.id);
  }, [keyChanged, conversation?.verified, peer, cid, unmarkVerified]);

  const slots = groups ?? Array.from({ length: 12 }, () => null);

  return (
    <Screen edges={['top']}>
      <BackHeader title="Safety number" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: theme.space.xl, paddingBottom: theme.space['6xl'], gap: theme.space.xl }}>
        <Text variant="body" tone="secondary" center style={{ paddingTop: theme.space.md }}>
          {unavailable
            ? 'Safety numbers verify your encryption keys. They are available once you are on the encrypted network with this contact.'
            : `Compare these numbers with ${title} in person or on a call to confirm your conversation is private.`}
        </Text>

        {keyChanged ? (
          <Surface variant="flat" style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.md, padding: theme.space.lg, borderWidth: 1, borderColor: theme.colors.warning }}>
            <Icon icon={ShieldAlert} tone="warning" />
            <Text variant="footnote" tone="secondary" style={{ flex: 1 }}>
              {title}&apos;s safety number has changed. This can happen if they reinstalled or switched phones. Verify again before trusting it.
            </Text>
          </Surface>
        ) : null}

        {!unavailable ? (
          <Surface variant="flat" style={{ padding: theme.space.lg }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: theme.space.sm }}>
              {slots.map((group, index) => (
                <Text key={index} variant="mono" tone={group ? 'ink' : 'tertiary'} style={{ width: '33.33%', textAlign: 'center' }}>
                  {group ?? '-----'}
                </Text>
              ))}
            </View>
          </Surface>
        ) : null}

        {!unavailable ? (
          <Surface variant="flat" style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.md, padding: theme.space.lg }}>
            <Icon icon={isVerified ? ShieldCheck : ShieldAlert} tone={isVerified ? 'success' : 'secondary'} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">Mark as verified</Text>
              <Text variant="footnote" tone="secondary">
                Verified contacts show a badge, and you are alerted if their key ever changes.
              </Text>
            </View>
            <Toggle
              value={isVerified}
              onValueChange={(next) => {
                if (!peer || !peerKey) return;
                if (next) markVerified(cid, peer.id, peerKey);
                else unmarkVerified(cid, peer.id);
              }}
              accessibilityLabel="Mark as verified"
            />
          </Surface>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
