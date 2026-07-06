// Export your data: the no-lock-in feature. A user-held-key encrypted archive that restores
// identically across iOS and Android, which no incumbent offers.

import { Download, KeyRound, ShieldCheck, type LucideIcon } from 'lucide-react-native';
import { Alert, ScrollView, View } from 'react-native';

import { BackHeader } from '@/components/layout/BackHeader';
import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { Surface } from '@/components/ui/Surface';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme/ThemeProvider';

export default function ExportScreen() {
  const theme = useTheme();

  const point = (icon: LucideIcon, title: string, body: string) => (
    <View style={{ flexDirection: 'row', gap: theme.space.md, alignItems: 'flex-start' }}>
      <Icon icon={icon} tone="accent" />
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="footnote" tone="secondary">
          {body}
        </Text>
      </View>
    </View>
  );

  return (
    <Screen edges={['top']}>
      <BackHeader title="Export your data" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: theme.space.xl, paddingBottom: theme.space['6xl'], gap: theme.space.xl }}>
        <Text variant="body" tone="secondary">
          Your history is yours. Export a full, encrypted archive you hold the key to, and restore it on any phone, iOS
          or Android. No other messenger lets you move your messages this freely.
        </Text>

        <Surface variant="flat" style={{ padding: theme.space.lg, gap: theme.space.lg }}>
          {point(KeyRound, 'You hold the key', 'The archive is encrypted with a key only you have. We never see the contents.')}
          {point(ShieldCheck, 'Restores identically', 'Move between iPhone and Android and keep every message, exactly.')}
          {point(Download, 'Your storage', 'Save to your device, iCloud, Drive, or anywhere you trust.')}
        </Surface>

        <Button
          label="Prepare encrypted archive"
          variant="primary"
          fullWidth
          onPress={() =>
            Alert.alert('Export', 'A signed, user-held-key encrypted archive would be prepared and saved to your chosen destination.')
          }
        />
      </ScrollView>
    </Screen>
  );
}
