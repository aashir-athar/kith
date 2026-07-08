// TanStack Query client. Conservative defaults tuned for a messaging app: short staleness,
// no window-focus refetch (native), bounded retries. Message data is local-first (the chat store
// persisted encrypted-at-rest); Query is for server-derived reads (directory lookups, media).

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});
