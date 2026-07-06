// Lever: Zeigarnik / progress framing. An empty inbox reassures rather than nags, and states
// the core promise (default E2E) up front to build trust on the very first screen.

import { EmptyState } from '@/components/feedback/EmptyState';
import { Header } from '@/components/layout/Header';
import { Screen } from '@/components/layout/Screen';

export default function ChatsScreen() {
  return (
    <Screen>
      <Header title="Chats" subtitle="Private by default" />
      <EmptyState
        title="No conversations yet"
        body="Start a chat and it lands here. Everything you send is end-to-end encrypted by default, even from us."
      />
    </Screen>
  );
}
