// Full-screen media viewer. Skeleton holds the frame until the image resolves. Presented as
// a full-screen modal.

import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTheme } from '@/theme/ThemeProvider';

export default function MediaViewer() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const mediaId = typeof id === 'string' ? id : 'kith';
  const [loaded, setLoaded] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.base }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {!loaded ? <Skeleton style={StyleSheet.absoluteFill} radius={0} /> : null}
        <Image
          source={{ uri: `https://picsum.photos/seed/${mediaId}/1200/1600` }}
          style={{ width: '100%', height: '100%' }}
          contentFit="contain"
          transition={150}
          onLoad={() => setLoaded(true)}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close"
        onPress={() => router.back()}
        style={{
          position: 'absolute',
          top: insets.top + theme.space.sm,
          left: theme.space.lg,
          width: 40,
          height: 40,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.scrim,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon icon={X} tone="ink" />
      </Pressable>
    </View>
  );
}
