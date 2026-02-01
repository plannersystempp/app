import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface CreateCheckoutParams {
  planId: string;
  teamId: string;
}

export function useStripeCheckout() {
  return useMutation({
    mutationFn: async ({ planId, teamId }: CreateCheckoutParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('Usuário não autenticado');
      }

      const origin = window.location.origin;
      const successUrl = `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}&plan=${planId}&team=${teamId}`;
      const cancelUrl = `${origin}/plans?payment=canceled`;

      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: {
          planId,
          teamId,
          successUrl,
          cancelUrl
        }
      });

      if (error) {
        console.error('Erro detalhado do checkout:', error);
        
        // Tentar extrair mensagem de erro do servidor
        try {
          const ctx = (error as any)?.context;
          const res = ctx?.response as Response | undefined;

          let body: any = ctx?.data;
          if (!body && res) {
            try {
              body = await res.clone().json();
            } catch {
              try {
                const text = await res.clone().text();
                body = text ? { message: text } : undefined;
              } catch {
                body = undefined;
              }
            }
          }

          const serverMsg = body?.error || body?.details || body?.message;
          const serverCode = body?.code;
          const requestId = body?.request_id;
          if (serverMsg) {
            console.error('Detalhe do erro do servidor:', { serverCode, requestId, body });
            throw new Error(serverMsg);
          }
        } catch (parseError) {
          // Se o erro for o que nós lançamos acima, repassar
          if (parseError instanceof Error && parseError.message && parseError.message !== 'Falha ao iniciar o checkout. Tente novamente em alguns instantes.') {
            throw parseError;
          }
        }
        
        // Mensagens específicas por tipo de erro
        const errorMessage = (error as any)?.message || '';
        if (errorMessage.includes('not found')) {
          throw new Error('Plano não encontrado. Por favor, tente novamente.');
        } else if (errorMessage.includes('stripe')) {
          throw new Error('Erro ao processar com Stripe. Verifique sua configuração.');
        } else if (errorMessage.includes('network')) {
          throw new Error('Erro de conexão. Verifique sua internet e tente novamente.');
        }
        
        throw new Error('Falha ao iniciar o checkout. Tente novamente em alguns instantes.');
      }
      if (!data?.url) throw new Error('URL do checkout não retornada');

      return data;
    },
    onError: (error: Error) => {
      console.error('Erro ao criar checkout:', error);
      toast({
        title: 'Erro ao processar pagamento',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}
