// Status composer: a text status on a chosen background, with an audience picker. Ephemeral,
// encrypted, ad-free. Photo status wires into the same addStatus call.

import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { BackHeader } from '@/components/layout/BackHeader';
import { Screen } from '@/components/layout/Screen';
import { SegmentedControl, type SegmentOption } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { useStatusStore } from '@/stores/useStatusStore';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamily } from '@/theme/typography';

const BACKGROUNDS = ['#221F26', '#1E2740', '#33401E', '#401E33', '#1E4034', '#40341E'];

type Audience = 'contacts' | 'close' | 'custom';
const AUDIENCES: readonly SegmentOption<Audience>[] = [
  { label: 'Contacts', value: 'contacts' },
  { label: 'Close friends', value: 'close' },
  { label: 'Custom', value: 'custom' },
];

export default function StatusComposeScreen() {
  const theme = useTheme();
  const addStatus = useStatusStore((s) => s.addStatus);
  const [text, setText] = useState('');
  const [background, setBackground] = useState<string>('#221F26');
  const [audience, setAudience] = useState<Audience>('contacts');

  const post = () => {
    if (!text.trim()) return;
    addStatus('text', { text: text.trim(), background });
    router.back();
  };

  return (
    <Screen edges={['top']}>
      <BackHeader
        title="New status"
        right={
          <Pressable accessibilityRole="button" accessibilityLabel="Post status" disabled={!text.trim()} onPress={post}>
            <Text variant="callout" tone={text.trim() ? 'accent' : 'tertiary'}>
              Post
            </Text>
          </Pressable>
        }
      />

      <View style={{ flex: 1, paddingHorizontal: theme.space.xl, gap: theme.space.lg }}>
        <View
          style={{
            height: 280,
            borderRadius: theme.radius.lg,
            backgroundColor: background,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: theme.space.xl,
          }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Type a status"
            placeholderTextColor="rgba(255,255,255,0.6)"
            multiline
            autoFocus
            style={{
              fontFamily: fontFamily.displayBold,
              fontSize: 26,
              lineHeight: 32,
              color: '#FFFFFF',
              textAlign: 'center',
            }}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: theme.space.sm, justifyContent: 'center' }}>
          {BACKGROUNDS.map((color) => (
            <Pressable
              key={color}
              accessibilityRole="button"
              accessibilityLabel="Background color"
              accessibilityState={{ selected: color === background }}
              onPress={() => setBackground(color)}
              style={{
                width: 34,
                height: 34,
                borderRadius: 17,
                backgroundColor: color,
                borderWidth: 2,
                borderColor: color === background ? theme.colors.accent : theme.colors.hairline,
              }}
            />
          ))}
        </View>

        <View style={{ gap: theme.space.sm }}>
          <Text variant="caption" tone="secondary" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
            Who can see this
          </Text>
          <SegmentedControl options={AUDIENCES} value={audience} onChange={setAudience} />
        </View>
      </View>
    </Screen>
  );
}
