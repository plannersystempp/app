import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useState } from 'react';

interface CreateCheckoutParams {
  planId: string;
  teamId: string;
  successUrl?: string;
  cancelUrl?: string;
}

interface CheckoutSession {
  url: string;
  sessionId: string;
}

interface UseStripeCheckoutResult {
  createCheckout: (params: CreateCheckoutParams) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
  resetError: () => void;
}

export function useStripeCheckoutEnhanced(): UseStripeCheckoutResult {
  const [localError, setLocalError] = useState<Error | null>(null);
  
  const mutation = useMutation({
    mutationFn: async ({ planId, teamId, successUrl, cancelUrl }: CreateCheckoutParams): Promise<CheckoutSession> => {
      try {
        // Verificar autenticação
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          throw new Error('Você precisa estar logado para realizar esta ação');
        }

        // Verificar se o plano existe
        const { data: plan, error: planError } = await supabase
          .from('subscription_plans')
          .select('id, name, price, is_active')
          .eq('id', planId)
          .single();

        if (planError || !plan) {
          throw new Error('Plano não encontrado');
        }

        if (!plan.is_active) {
          throw new Error('Este plano não está mais disponível');
        }

        // Verificar se o time existe e o usuário tem permissão
        const { data: team, error: teamError } = await supabase
          .from('teams')
          .select('id, name')
          .eq('id', teamId)
          .single();

        if (teamError || !team) {
          throw new Error('Time não encontrado');
        }

        // Criar URLs de retorno
        const origin = window.location.origin;
        const finalSuccessUrl = successUrl || `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&plan=${planId}&team=${teamId}`;
        const finalCancelUrl = cancelUrl || `${origin}/plans?payment=canceled`;

        // Chamar função do Supabase para criar sessão de checkout
        // Em produção, já vimos casos em que o invoke não envia o Authorization automaticamente.
        // Forçamos o header para garantir compatibilidade com verify_jwt=true.
        const { data, error } = await supabase.functions.invoke('create-checkout-session', {
          body: {
            planId,
            teamId,
            successUrl: finalSuccessUrl,
            cancelUrl: finalCancelUrl,
            planName: plan.name,
            planPrice: plan.price
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });

        if (error) {
          console.error('Erro na função create-checkout-session:', error);
          
          // Tentar extrair mensagem de erro específica
          let errorMessage = 'Erro ao processar pagamento';
          
          try {
            const errorContext = (error as any)?.context;
            if (errorContext?.response) {
              const errorData = await errorContext.response.json();
              const message = errorData?.error || errorData?.message;
              const code = errorData?.code;
              if (code === 401) {
                errorMessage = 'Sua sessão expirou. Faça login novamente e tente de novo.';
              } else {
                errorMessage = message || errorMessage;
              }
            }
          } catch {
            // Se não conseguir parsear, usar mensagem padrão
            const message = (error as any)?.message || '';
            if (message.includes('stripe')) {
              errorMessage = 'Erro ao conectar com o Stripe. Tente novamente em alguns instantes.';
            } else if (message.includes('network')) {
              errorMessage = 'Erro de conexão. Verifique sua internet.';
            } else if (message.includes('permission')) {
              errorMessage = 'Você não tem permissão para realizar esta ação.';
            }
          }
          
          throw new Error(errorMessage);
        }

        if (!data?.url) {
          throw new Error('URL de checkout não recebida');
        }

        return {
          url: data.url,
          sessionId: data.sessionId || data.id || 'unknown'
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro ao criar sessão de checkout';
        console.error('Erro detalhado:', error);
        throw new Error(errorMessage);
      }
    },
    onSuccess: (data) => {
      // Redirecionar para o Stripe Checkout
      if (data?.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      setLocalError(error);
      
      // Mostrar toast com erro amigável
      let userMessage = error.message;
      
      // Mensagens mais amigáveis para erros comuns
      if (error.message.includes('logado')) {
        userMessage = 'Por favor, faça login para continuar';
      } else if (error.message.includes('disponível')) {
        userMessage = 'Este plano não está mais disponível. Por favor, escolha outro.';
      } else if (error.message.includes('conexão')) {
        userMessage = 'Verifique sua conexão com a internet e tente novamente';
      } else if (error.message.includes('Stripe')) {
        userMessage = 'Erro ao processar pagamento. Tente novamente em alguns instantes.';
      }
      
      toast({
        title: 'Erro ao processar pagamento',
        description: userMessage,
        variant: 'destructive',
        duration: 5000,
      });
    }
  });

  const createCheckout = async (params: CreateCheckoutParams): Promise<void> => {
    setLocalError(null);
    await mutation.mutateAsync(params);
  };

  return {
    createCheckout,
    isLoading: mutation.isPending,
    error: localError || (mutation.error instanceof Error ? mutation.error : null),
    resetError: () => setLocalError(null)
  };
}
