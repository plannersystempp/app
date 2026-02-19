import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export function useSubscriptionActions() {
  const queryClient = useQueryClient();

  const extendTrial = useMutation({
    mutationFn: async ({ subscriptionId, days }: { subscriptionId: string; days: number }) => {
      // Buscar assinatura atual
      const { data: subscription, error: fetchError } = await supabase
        .from('team_subscriptions')
        .select('trial_ends_at, status')
        .eq('id', subscriptionId)
        .single();

      if (fetchError) throw fetchError;

      if (subscription.status !== 'trial' && subscription.status !== 'trial_expired') {
        throw new Error('Apenas assinaturas em trial podem ser estendidas');
      }

      // Calcular nova data de expiração
      const currentDate = subscription.trial_ends_at 
        ? new Date(subscription.trial_ends_at) 
        : new Date();
      
      currentDate.setDate(currentDate.getDate() + days);

      // Atualizar assinatura
      const { error: updateError } = await supabase
        .from('team_subscriptions')
        .update({
          trial_ends_at: currentDate.toISOString(),
          current_period_ends_at: currentDate.toISOString(),
          status: 'trial',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);

      if (updateError) throw updateError;

      return { subscriptionId, days };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-stats'] });
      toast({ title: 'Trial estendido com sucesso!' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao estender trial',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const changePlan = useMutation({
    mutationFn: async ({ subscriptionId, newPlanId }: { subscriptionId: string; newPlanId: string }) => {
      const { error } = await supabase
        .from('team_subscriptions')
        .update({
          plan_id: newPlanId,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);

      if (error) throw error;

      return { subscriptionId, newPlanId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-stats'] });
      toast({ title: 'Plano alterado com sucesso!' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao alterar plano',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const reactivateSubscription = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const { data: currentSubscription, error: fetchError } = await supabase
        .from('team_subscriptions')
        .select('id, subscription_plans(billing_cycle)')
        .eq('id', subscriptionId)
        .single();

      if (fetchError) throw fetchError;

      const billingCycle = (currentSubscription as any)?.subscription_plans?.billing_cycle as string | undefined;

      const now = new Date();
      let newEndDate: Date | null = now;

      if (billingCycle === 'lifetime') {
        newEndDate = null;
      } else if (billingCycle === 'yearly') {
        newEndDate = new Date(now);
        newEndDate.setFullYear(newEndDate.getFullYear() + 1);
      } else {
        newEndDate = new Date(now);
        newEndDate.setMonth(newEndDate.getMonth() + 1);
      }

      const { error } = await supabase
        .from('team_subscriptions')
        .update({
          status: 'active',
          current_period_starts_at: now.toISOString(),
          current_period_ends_at: newEndDate ? newEndDate.toISOString() : null,
          canceled_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);

      if (error) throw error;

      return subscriptionId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-stats'] });
      toast({ title: 'Assinatura reativada com sucesso!' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao reativar assinatura',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const cancelSubscription = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const { error } = await supabase
        .from('team_subscriptions')
        .update({
          status: 'canceled',
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);

      if (error) throw error;

      return subscriptionId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-stats'] });
      toast({ title: 'Assinatura cancelada com sucesso!' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao cancelar assinatura',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  return {
    extendTrial,
    changePlan,
    reactivateSubscription,
    cancelSubscription
  };
}
