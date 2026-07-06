// Lever: belonging + trust. Communities is the breadth play; the copy promises encrypted
// group messaging, the thing Telegram never gives its groups.

import { EmptyState } from '@/components/feedback/EmptyState';
import { Header } from '@/components/layout/Header';
import { Screen } from '@/components/layout/Screen';

export default function CommunitiesScreen() {
  return (
    <Screen>
      <Header title="Communities" subtitle="Encrypted, moderated, yours" />
      <EmptyState
        title="No communities yet"
        body="Join or create a community. Group messages stay end-to-end encrypted, so what you say stays with your people."
      />
    </Screen>
  );
}
