import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { SubscriptionWithPlan } from '@/types/subscription';

interface UseUserSubscriptionResult {
  subscription: SubscriptionWithPlan | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

interface UpdateSubscriptionParams {
  planId: string;
  teamId: string;
}

interface CancelSubscriptionParams {
  teamId: string;
  reason?: string;
}

interface SubscriptionLimitsUI {
  personnel: number | null;
  events: number | null;
  maxTeamMembers: number | null;
  storage: number;
  canAccessAdvancedFeatures: boolean;
  canExportData: boolean;
}

export function useUserSubscription(teamId?: string): UseUserSubscriptionResult {
  const queryClient = useQueryClient();
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['user-subscription', teamId],
    queryFn: async (): Promise<SubscriptionWithPlan | null> => {
      if (!teamId) return null;
      
      try {
        const { data: subscription, error } = await supabase
          .from('team_subscriptions')
          .select(`
            *,
            subscription_plans(*)
          `)
          .eq('team_id', teamId)
          .in('status', ['active', 'trial', 'past_due'])
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // Nenhuma subscription encontrada
            return null;
          }
          throw error;
        }

        return subscription as SubscriptionWithPlan;
      } catch (error) {
        console.error('Erro ao buscar subscription:', error);
        throw new Error('Não foi possível carregar suas informações de assinatura');
      }
    },
    enabled: !!teamId,
    staleTime: 1000 * 60 * 5, // 5 minutos
    retry: 2,
  });

  return {
    subscription: data || null,
    isLoading,
    error: error
      ? (error instanceof Error ? error : new Error((error as any)?.message || 'Erro desconhecido'))
      : null,
    refetch
  };
}

export function useSubscriptionLimits(teamId?: string) {
  return useQuery({
    queryKey: ['subscription-limits', teamId],
    queryFn: async (): Promise<SubscriptionLimitsUI> => {
      if (!teamId) {
        return {
          personnel: 10,
          events: 2,
          storage: 1,
          canAccessAdvancedFeatures: false,
          canExportData: false,
          maxTeamMembers: 1
        };
      }

      try {
        const { data: subscription, error } = await supabase
          .from('team_subscriptions')
          .select(`
            status,
            subscription_plans(limits)
          `)
          .eq('team_id', teamId)
          .in('status', ['active', 'trial', 'trialing'])
          .single();

        if (error) {
          const code = (error as any)?.code;
          if (code === 'PGRST116') {
            return {
              personnel: 10,
              events: 2,
              storage: 1,
              canAccessAdvancedFeatures: false,
              canExportData: false,
              maxTeamMembers: 1
            };
          }
          throw error;
        }

        if (!subscription) {
          return {
            personnel: 10,
            events: 2,
            storage: 1,
            canAccessAdvancedFeatures: false,
            canExportData: false,
            maxTeamMembers: 1
          };
        }

        const rawLimits = (subscription as any)?.subscription_plans?.limits as any;

        const resolveLimit = (value: any, fallback: number): number | null => {
          if (value === null) return null;
          if (typeof value === 'number' && Number.isFinite(value)) return value;
          if (typeof value === 'string' && value.trim()) {
            const n = Number(value);
            return Number.isFinite(n) ? n : fallback;
          }
          if (typeof value === 'undefined') return fallback;
          return fallback;
        };

        const maxTeamMembers = resolveLimit(rawLimits?.max_team_members, 1);
        const maxEventsPerMonth = resolveLimit(rawLimits?.max_events_per_month, 2);
        const maxPersonnel = resolveLimit(rawLimits?.max_personnel, 10);

        return {
          personnel: maxPersonnel,
          events: maxEventsPerMonth,
          storage: 1,
          canAccessAdvancedFeatures: false,
          canExportData: false,
          maxTeamMembers
        };
      } catch (error) {
        console.error('Erro ao buscar limites:', error);
        // Retornar limites do plano gratuito em caso de erro
        return {
          personnel: 10,
          events: 2,
          storage: 1,
          canAccessAdvancedFeatures: false,
          canExportData: false,
          maxTeamMembers: 1
        };
      }
    },
    enabled: !!teamId,
    staleTime: 1000 * 60 * 10,
    retry: false,
  });
}

export function useUpdateSubscription() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ planId, teamId }: UpdateSubscriptionParams) => {
      try {
        const { data, error } = await supabase
          .from('team_subscriptions')
          .update({
            plan_id: planId,
            updated_at: new Date().toISOString()
          })
          .eq('team_id', teamId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Erro ao atualizar subscription:', error);
        throw new Error('Não foi possível atualizar seu plano. Tente novamente.');
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-subscription', variables.teamId] });
      queryClient.invalidateQueries({ queryKey: ['subscription-limits', variables.teamId] });
      toast({
        title: 'Plano atualizado com sucesso!',
        description: 'Suas novas funcionalidades já estão disponíveis.',
        variant: 'default'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao atualizar plano',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ teamId, reason }: CancelSubscriptionParams) => {
      try {
        const { data, error } = await supabase
          .from('team_subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            cancel_reason: reason
          })
          .eq('team_id', teamId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (error) {
        console.error('Erro ao cancelar subscription:', error);
        throw new Error('Não foi possível cancelar sua assinatura. Tente novamente.');
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['user-subscription', variables.teamId] });
      queryClient.invalidateQueries({ queryKey: ['subscription-limits', variables.teamId] });
      toast({
        title: 'Assinatura cancelada',
        description: 'Sua assinatura foi cancelada e continuará ativa até o final do período.',
        variant: 'default'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao cancelar assinatura',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
}
