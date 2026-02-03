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
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Erro detalhado do checkout:', error);
        
        let serverErrorMsg = '';
        
        try {
          // Tenta extrair erro do contexto do Supabase (FunctionsHttpError)
          const context = (error as any)?.context;
          if (context && context.response instanceof Response) {
             const res = context.response;
             console.log('Status da resposta do checkout:', res.status);
             
             try {
                // Tenta ler JSON primeiro
                const data = await res.clone().json();
                serverErrorMsg = data.error || data.message || data.details || '';
                if (data.code) console.error('Código de erro do servidor:', data.code);
             } catch {
                // Se falhar, tenta ler texto
                serverErrorMsg = await res.clone().text();
             }
          }
        } catch (extractError) {
          console.error('Erro ao extrair detalhes do erro:', extractError);
        }

        if (serverErrorMsg) {
           throw new Error(serverErrorMsg);
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
        
        // Se for o erro genérico do Supabase e não conseguimos extrair o body
        if (errorMessage === 'Edge Function returned a non-2xx status code') {
           throw new Error('Erro de comunicação com o servidor de pagamentos. Tente novamente.');
        }
        
        // Se tiver mensagem original, usa ela, senão fallback
        if (errorMessage) {
            throw new Error(errorMessage);
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
