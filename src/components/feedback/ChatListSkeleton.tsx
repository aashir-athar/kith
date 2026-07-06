// Loading placeholder for the chats list, shaped like ChatListItem rows. Shown while the
// encrypted local store hydrates, so the first paint has structure, never a spinner.

import { View } from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import { useTheme } from '@/theme/ThemeProvider';

export function ChatListSkeleton({ rows = 7 }: { rows?: number }) {
  const theme = useTheme();
  return (
    <View style={{ flex: 1 }} accessibilityLabel="Loading conversations">
      {Array.from({ length: rows }).map((_, i) => (
        <View
          key={i}
          style={{ flexDirection: 'row', alignItems: 'center', gap: theme.space.md, paddingHorizontal: theme.space.xl, paddingVertical: theme.space.sm }}>
          <Skeleton width={52} height={52} radius={26} />
          <View style={{ flex: 1, gap: theme.space.xs }}>
            <Skeleton width="55%" height={14} />
            <Skeleton width="80%" height={12} />
          </View>
          <Skeleton width={28} height={12} />
        </View>
      ))}
    </View>
  );
}
