import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface VerifyPaymentParams {
  sessionId: string;
  teamId: string;
  planId: string;
}

interface VerifyPaymentResponse {
  success: boolean;
  status: string;
  subscription?: {
    id: string;
    plan_name: string;
    period_start: string;
    period_end: string | null;
    billing_cycle?: string;
  };
  message?: string;
  error?: string;
}

export function useVerifyPayment() {
  return useMutation({
    mutationFn: async ({ sessionId, teamId, planId }: VerifyPaymentParams): Promise<VerifyPaymentResponse> => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        throw new Error('Sua sessão expirou. Faça login novamente e tente de novo.');
      }

      const { data: isSuperAdmin, error: isSuperAdminError } = await supabase.rpc('is_super_admin');
      if (isSuperAdminError) throw isSuperAdminError;
      if (isSuperAdmin) {
        throw new Error(
          'Superadmin não deve passar pelo fluxo de pagamento/ativação. Use uma conta admin do time para finalizar compras.'
        );
      }

      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: {
          sessionId,
          teamId,
          planId
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (error) throw error;
      return data;
    }
  });
}
