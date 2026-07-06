// Chat folder filter chips. Selected chip uses the accent fill (an active-state signal).

import { Pressable, ScrollView } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';

export type ChatFolder = 'all' | 'unread' | 'groups' | 'pinned';

const FOLDERS: { key: ChatFolder; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'groups', label: 'Groups' },
  { key: 'pinned', label: 'Pinned' },
];

export function FolderChips({ value, onChange }: { value: ChatFolder; onChange: (folder: ChatFolder) => void }) {
  const theme = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: theme.space.xl, gap: theme.space.sm, paddingBottom: theme.space.sm }}>
      {FOLDERS.map((folder) => {
        const selected = folder.key === value;
        return (
          <Pressable
            key={folder.key}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={folder.label}
            onPress={() => onChange(folder.key)}
            style={{
              paddingHorizontal: theme.space.lg,
              height: 34,
              borderRadius: theme.radius.pill,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected ? theme.colors.accent : theme.colors.surface,
            }}>
            <Text variant="subhead" tone={selected ? 'onAccent' : 'secondary'}>
              {folder.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
