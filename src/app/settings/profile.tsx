// Edit profile: photo, name, username, bio. Changes commit to the session on save. The photo
// picker is mocked (samples); the real image picker wires into the same avatar state.

import { router } from 'expo-router';
import { Camera } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { BackHeader } from '@/components/layout/BackHeader';
import { Screen } from '@/components/layout/Screen';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { newId } from '@/lib/id';
import { useSessionStore } from '@/stores/useSessionStore';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamily } from '@/theme/typography';

const BIO_MAX = 140;

export default function EditProfileScreen() {
  const theme = useTheme();
  const user = useSessionStore((s) => s.currentUser);
  const setDisplayName = useSessionStore((s) => s.setDisplayName);
  const setUsername = useSessionStore((s) => s.setUsername);
  const setBio = useSessionStore((s) => s.setBio);
  const setAvatarUrl = useSessionStore((s) => s.setAvatarUrl);

  const [displayName, setName] = useState(user.displayName);
  const [username, setHandle] = useState(user.username);
  const [bio, setBioLocal] = useState(user.bio ?? '');
  const [avatarUrl, setAvatarLocal] = useState<string | undefined>(user.avatarUrl);

  const valid = displayName.trim().length > 0 && username.trim().length >= 3;

  const save = () => {
    if (!valid) return;
    setDisplayName(displayName.trim());
    setUsername(username.trim());
    setBio(bio.trim());
    setAvatarUrl(avatarUrl);
    router.back();
  };

  const fieldWrap = {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.space.lg,
    paddingVertical: theme.space.sm,
  };
  const inputStyle = {
    color: theme.colors.ink,
    fontFamily: fontFamily.body,
    fontSize: 17,
    paddingVertical: theme.space.xs,
  };
  const labelStyle = { textTransform: 'uppercase' as const, letterSpacing: 1 };

  return (
    <Screen edges={['top']}>
      <BackHeader
        title="Edit profile"
        right={
          <Pressable accessibilityRole="button" accessibilityLabel="Save" disabled={!valid} onPress={save}>
            <Text variant="callout" tone={valid ? 'accent' : 'tertiary'}>
              Save
            </Text>
          </Pressable>
        }
      />
      <View style={{ flex: 1, paddingHorizontal: theme.space.xl, gap: theme.space.xl }}>
        <View style={{ alignItems: 'center', gap: theme.space.sm, paddingTop: theme.space.md }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            onPress={() => setAvatarLocal(`https://picsum.photos/seed/${newId()}/320/320`)}>
            <Avatar name={displayName || 'You'} seed={user.id} url={avatarUrl} size={96} />
            <View
              style={{
                position: 'absolute',
                right: -2,
                bottom: -2,
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: theme.colors.accent,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 3,
                borderColor: theme.colors.base,
              }}>
              <Icon icon={Camera} size={16} tone="onAccent" />
            </View>
          </Pressable>
          {avatarUrl ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Remove photo" onPress={() => setAvatarLocal(undefined)}>
              <Text variant="footnote" tone="secondary">
                Remove photo
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View style={{ gap: theme.space.md }}>
          <View style={{ gap: theme.space.xs }}>
            <Text variant="caption" tone="secondary" style={labelStyle}>
              Name
            </Text>
            <View style={fieldWrap}>
              <TextInput
                value={displayName}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={theme.colors.inkTertiary}
                style={inputStyle}
              />
            </View>
          </View>

          <View style={{ gap: theme.space.xs }}>
            <Text variant="caption" tone="secondary" style={labelStyle}>
              Username
            </Text>
            <View style={[fieldWrap, { flexDirection: 'row', alignItems: 'center', gap: theme.space.xs }]}>
              <Text variant="headline" tone="tertiary">
                @
              </Text>
              <TextInput
                value={username}
                onChangeText={(t) => setHandle(t.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="username"
                placeholderTextColor={theme.colors.inkTertiary}
                style={[inputStyle, { flex: 1 }]}
              />
            </View>
          </View>

          <View style={{ gap: theme.space.xs }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text variant="caption" tone="secondary" style={labelStyle}>
                Bio
              </Text>
              <Text variant="caption" tone="tertiary">
                {bio.length}/{BIO_MAX}
              </Text>
            </View>
            <View style={fieldWrap}>
              <TextInput
                value={bio}
                onChangeText={(t) => setBioLocal(t.slice(0, BIO_MAX))}
                placeholder="Add a few words about you"
                placeholderTextColor={theme.colors.inkTertiary}
                multiline
                style={[inputStyle, { minHeight: 72, textAlignVertical: 'top' }]}
              />
            </View>
          </View>
        </View>

        <View style={{ flex: 1 }} />
        <Button label="Save changes" variant="primary" fullWidth disabled={!valid} onPress={save} />
        <View style={{ height: theme.space['3xl'] }} />
      </View>
    </Screen>
  );
}
