import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/fetch";

/**
 * Single shared QueryClient.
 *
 * Defaults:
 *  - 60s stale time: avoids refetching lists on every navigation between
 *    sibling pages, but still revalidates quickly when data may change.
 *  - Queries never auto-retry on 4xx (auth, validation) — those failures
 *    are deterministic. Network/5xx errors retry once.
 *  - gcTime stays at the library default of 5 min; this matters when a user
 *    navigates back to a page they visited a moment ago.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof ApiError) {
          const code = Number(error.code);
          if (code >= 400 && code < 500) return false;
        }
        return failureCount < 1;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
