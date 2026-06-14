import { QueryClient } from "@tanstack/react-query";

// Single shared QueryClient for the app. These defaults replace the manual
// loading/error/cache bookkeeping that the Redux slices currently hand-roll:
//  - staleTime: don't refetch the same data on every mount/focus for 30s
//  - retry: one retry on transient failures
//  - 401s are already handled globally by the axios interceptor (logout),
//    so we don't retry auth failures here.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        const status = error?.response?.status;
        if (status === 401 || status === 403 || status === 404) return false;
        return failureCount < 1;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
