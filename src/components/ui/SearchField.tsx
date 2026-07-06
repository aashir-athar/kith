// Search input. Semantic search is the default search in Kith; this is its entry field.

import { Search } from 'lucide-react-native';
import { TextInput, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { useTheme } from '@/theme/ThemeProvider';
import { fontFamily } from '@/theme/typography';

export interface SearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function SearchField({ value, onChangeText, placeholder = 'Search', autoFocus = false }: SearchFieldProps) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.space.sm,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.md,
        paddingHorizontal: theme.space.lg,
        height: 44,
      }}>
      <Icon icon={Search} size={18} tone="tertiary" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.inkTertiary}
        autoFocus={autoFocus}
        style={{ flex: 1, color: theme.colors.ink, fontFamily: fontFamily.body, fontSize: 16 }}
      />
    </View>
  );
}
