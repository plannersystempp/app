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

        const { data: isSuperAdmin, error: isSuperAdminError } = await supabase.rpc('is_super_admin');
        if (isSuperAdminError) throw isSuperAdminError;
        if (isSuperAdmin) {
          throw new Error(
            'Superadmin não realiza checkout. Use uma conta admin do time para assinar ou gerencie assinaturas no painel.'
          );
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
            // Tenta verificar se é um erro estruturado do Edge Function (ex: jsonResponse)
            const errorContext = (error as any)?.context;
            if (errorContext?.response) {
              const response = errorContext.response;
              
              // Se a resposta for JSON, tenta extrair
              try {
                const errorData = await response.clone().json();
                const message = errorData?.error || errorData?.message;
                const code = errorData?.code;
                
                if (code === 401 || response.status === 401) {
                  errorMessage = 'Sua sessão expirou. Faça login novamente e tente de novo.';
                } else if (message) {
                  errorMessage = message;
                }
              } catch {
                 // Se não for JSON, pega o texto
                 const text = await response.clone().text();
                 if (text) errorMessage = text;
              }
            } else if ((error as any).message) {
                 // Fallback para message do erro
                 errorMessage = (error as any).message;
            }
          } catch (e) {
             console.error('Falha ao parsear erro:', e);
             // Se não conseguir parsear, usar mensagem padrão ou do erro original
             const message = (error as any)?.message || '';
             if (message) errorMessage = message;
          }

          // Tratamento de mensagens comuns
          if (errorMessage.includes('stripe')) {
              errorMessage = 'Erro ao conectar com o Stripe. Tente novamente em alguns instantes.';
          } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
              errorMessage = 'Erro de conexão. Verifique sua internet.';
          } else if (errorMessage.includes('permission') || errorMessage.includes('403')) {
              errorMessage = 'Você não tem permissão para realizar esta ação.';
          } else if (errorMessage.includes('FunctionsHttpError') && errorMessage.includes('500')) {
              errorMessage = 'Erro interno no servidor de pagamentos. Tente novamente.';
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
