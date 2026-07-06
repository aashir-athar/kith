// Status viewer: full-screen, auto-advancing tap-through with progress bars. Tap right for
// next, left for previous. Text stories render on their background; photo stories fill.

import { router, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { LocalMedia } from '@/components/ui/LocalMedia';
import { Text } from '@/components/ui/Text';
import { relativeTime } from '@/lib/format';
import { me, usersById } from '@/lib/mockData';
import { useStatusStore } from '@/stores/useStatusStore';
import { useTheme } from '@/theme/ThemeProvider';
import type { Story } from '@/types/models';

const STORY_MS = 4000;

export default function StatusViewer() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const authorId = typeof id === 'string' ? id : '';

  const feeds = useStatusStore((s) => s.feeds);
  const myStories = useStatusStore((s) => s.myStories);
  const markSeen = useStatusStore((s) => s.markSeen);

  const stories: Story[] = authorId === me.id ? myStories : (feeds.find((f) => f.authorId === authorId)?.stories ?? []);
  const author = usersById[authorId];
  const authorName = authorId === me.id ? 'Your status' : (author?.displayName ?? 'Status');

  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (authorId && authorId !== me.id) markSeen(authorId);
  }, [authorId, markSeen]);

  useEffect(() => {
    if (stories.length === 0) return;
    setProgress(0);
    const interval = setInterval(() => setProgress((p) => (p >= 100 ? 100 : p + 2)), 80);
    const timeout = setTimeout(() => {
      if (index < stories.length - 1) setIndex((i) => i + 1);
      else router.back();
    }, STORY_MS);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [index, stories.length]);

  const story = stories[Math.min(index, Math.max(0, stories.length - 1))];
  if (!story) {
    return <View style={{ flex: 1, backgroundColor: theme.colors.base }} />;
  }

  const goNext = () => {
    if (index < stories.length - 1) setIndex((i) => i + 1);
    else router.back();
  };
  const goPrev = () => setIndex((i) => Math.max(0, i - 1));

  return (
    <View style={{ flex: 1, backgroundColor: story.kind === 'text' ? (story.background ?? theme.colors.surface) : '#0A0A0B' }}>
      {story.kind === 'image' ? (
        <LocalMedia seed={story.mediaUrl ?? story.id} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      ) : null}

      <View style={{ paddingTop: insets.top + theme.space.sm, paddingHorizontal: theme.space.lg, gap: theme.space.sm }}>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {stories.map((s, i) => (
            <View key={s.id} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' }}>
              <View
                style={{
                  height: 3,
                  width: `${i < index ? 100 : i === index ? progress : 0}%`,
                  backgroundColor: '#FFFFFF',
                }}
              />
            </View>
          ))}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.sm }}>
          <Avatar name={authorName} seed={authorId} url={author?.avatarUrl} size={36} />
          <View style={{ flex: 1 }}>
            <Text variant="subhead" style={{ color: '#FFFFFF' }} numberOfLines={1}>
              {authorName}
            </Text>
            <Text variant="caption" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {relativeTime(story.createdAt)}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={theme.hitSlop}
            onPress={() => router.back()}>
            <Icon icon={X} tone="ink" strokeWidth={2.4} />
          </Pressable>
        </View>
      </View>

      {story.kind === 'text' ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: theme.space['4xl'] }}>
          <Text variant="displayLg" center style={{ color: '#FFFFFF' }}>
            {story.text}
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1 }} />
      )}

      <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, flexDirection: 'row' }} pointerEvents="box-none">
        <Pressable accessibilityRole="button" accessibilityLabel="Previous" onPress={goPrev} style={{ width: '32%' }} />
        <Pressable accessibilityRole="button" accessibilityLabel="Next" onPress={goNext} style={{ flex: 1 }} />
      </View>
    </View>
  );
}
