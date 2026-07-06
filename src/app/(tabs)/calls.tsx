// Lever: safety cue. Calls leads with the encryption promise so the feature reads as private
// before the user has made a single call.

import { EmptyState } from '@/components/feedback/EmptyState';
import { Header } from '@/components/layout/Header';
import { Screen } from '@/components/layout/Screen';

export default function CallsScreen() {
  return (
    <Screen>
      <Header title="Calls" subtitle="End-to-end encrypted" />
      <EmptyState
        title="No calls yet"
        body="Audio and video calls are end-to-end encrypted. Start one from any chat and it shows up here."
      />
    </Screen>
  );
}
