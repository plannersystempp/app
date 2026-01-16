import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface PaymentStatus {
  sessionId: string;
  status: 'pending' | 'complete' | 'expired' | 'open';
  paymentStatus?: 'paid' | 'unpaid';
  customerEmail?: string;
  amountTotal?: number;
  currency?: string;
  planId?: string;
  teamId?: string;
  error?: string;
}

interface UsePaymentStatusOptions {
  enabled?: boolean;
  refetchInterval?: number;
  onStatusChange?: (status: PaymentStatus) => void;
}

interface UsePaymentStatusResult {
  paymentStatus: PaymentStatus | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function usePaymentStatus(
  sessionId?: string, 
  options: UsePaymentStatusOptions = {}
): UsePaymentStatusResult {
  const { enabled = true, refetchInterval, onStatusChange } = options;
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['payment-status', sessionId],
    queryFn: async (): Promise<PaymentStatus | null> => {
      if (!sessionId) return null;
      
      try {
        // Verificar autenticação
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          throw new Error('Você precisa estar logado para verificar o status do pagamento');
        }

        // Chamar função para verificar status da sessão
        const { data, error: verifyError } = await supabase.functions.invoke('verify-checkout-session', {
          body: { sessionId }
        });

        if (verifyError) {
          console.error('Erro ao verificar sessão:', verifyError);
          
          // Tentar extrair mensagem específica do erro
          let errorMessage = 'Erro ao verificar status do pagamento';
          
          try {
            const errorContext = (verifyError as any)?.context;
            if (errorContext?.response) {
              const errorData = await errorContext.response.json();
              errorMessage = errorData?.error || errorData?.message || errorMessage;
            }
          } catch {
            const message = (verifyError as any)?.message || '';
            if (message.includes('not found')) {
              errorMessage = 'Sessão de pagamento não encontrada';
            } else if (message.includes('expired')) {
              errorMessage = 'Sessão de pagamento expirada';
            }
          }
          
          throw new Error(errorMessage);
        }

        if (!data) {
          throw new Error('Dados do pagamento não encontrados');
        }

        const paymentStatus: PaymentStatus = {
          sessionId,
          status: data.status || 'pending',
          paymentStatus: data.payment_status,
          customerEmail: data.customer_email,
          amountTotal: data.amount_total,
          currency: data.currency,
          planId: data.plan_id,
          teamId: data.team_id
        };

        return paymentStatus;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro ao verificar status do pagamento';
        console.error('Erro detalhado:', error);
        
        // Não mostrar toast para erros de autenticação (o usuário será redirecionado)
        if (!errorMessage.includes('logado')) {
          toast({
            title: 'Erro ao verificar pagamento',
            description: errorMessage,
            variant: 'destructive'
          });
        }
        
        throw error;
      }
    },
    enabled: enabled && !!sessionId,
    refetchInterval: (data) => {
      // Parar de refetch se o pagamento estiver completo ou expirado
      if (data?.status === 'complete' || data?.status === 'expired') {
        return false;
      }
      return refetchInterval || 5000; // Default 5 segundos
    },
    staleTime: 5000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    onSuccess: (data) => {
      if (data && onStatusChange) {
        onStatusChange(data);
      }
      
      // Mostrar notificações baseadas no status
      if (data?.status === 'complete') {
        toast({
          title: 'Pagamento confirmado!',
          description: 'Sua assinatura foi ativada com sucesso.',
          variant: 'default'
        });
      } else if (data?.status === 'expired') {
        toast({
          title: 'Sessão expirada',
          description: 'A sessão de pagamento expirou. Por favor, tente novamente.',
          variant: 'destructive'
        });
      }
    }
  });

  return {
    paymentStatus: data,
    isLoading,
    error: error instanceof Error ? error : null,
    refetch
  };
}

interface UsePaymentHistoryOptions {
  teamId?: string;
  limit?: number;
}

interface PaymentHistoryItem {
  id: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'pending' | 'failed';
  created: string;
  description?: string;
  invoiceUrl?: string;
  receiptUrl?: string;
}

interface UsePaymentHistoryResult {
  payments: PaymentHistoryItem[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function usePaymentHistory(options: UsePaymentHistoryOptions = {}): UsePaymentHistoryResult {
  const { teamId, limit = 10 } = options;
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['payment-history', teamId, limit],
    queryFn: async (): Promise<PaymentHistoryItem[]> => {
      if (!teamId) return [];
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          throw new Error('Você precisa estar logado');
        }

        const { data, error: historyError } = await supabase.functions.invoke('get-payment-history', {
          body: { teamId, limit }
        });

        if (historyError) {
          console.error('Erro ao buscar histórico:', historyError);
          return [];
        }

        return data?.payments || [];
      } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        return [];
      }
    },
    enabled: !!teamId,
    staleTime: 1000 * 60 * 10, // 10 minutos
    retry: false,
  });

  return {
    payments: data || [],
    isLoading,
    error: error instanceof Error ? error : null,
    refetch
  };
}
