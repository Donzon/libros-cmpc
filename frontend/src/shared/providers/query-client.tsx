import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

const defaultQueryClient = createAppQueryClient();

type AppQueryProviderProps = {
  children: ReactNode;
  client?: QueryClient;
};

export function AppQueryProvider({
  children,
  client = defaultQueryClient,
}: AppQueryProviderProps) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
