import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Configure React Query with optimistic settings for better UX
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000, // ⚡ OTIMIZADO: 5 segundos para dados sempre frescos
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: true, // ✅ ATIVADO: Refetch ao voltar para a aba
      refetchOnReconnect: true,
      refetchOnMount: true, // ✅ ATIVADO: Sempre refetch ao montar componente
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Only retry network errors, not business logic errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});

interface QueryProviderProps {
  children: React.ReactNode;
}

export const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {import.meta.env.MODE === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
};

export { queryClient };