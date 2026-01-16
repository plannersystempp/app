import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SubscriptionPlan } from '@/types/subscription';
import { toast } from '@/hooks/use-toast';

interface UsePlansOptions {
  includeInactive?: boolean;
  orderBy?: 'price' | 'name' | 'created_at';
  orderDirection?: 'asc' | 'desc';
}

interface UsePlansResult {
  plans: SubscriptionPlan[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function usePlans(options: UsePlansOptions = {}): UsePlansResult {
  const { includeInactive = false, orderBy = 'price', orderDirection = 'asc' } = options;
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['subscription-plans', includeInactive, orderBy, orderDirection],
    queryFn: async (): Promise<SubscriptionPlan[]> => {
      try {
        let query = supabase
          .from('subscription_plans')
          .select('*')
          .order(orderBy, { ascending: orderDirection === 'asc' });

        if (!includeInactive) {
          query = query.eq('is_active', true);
        }

        const { data: plans, error: queryError } = await query;

        if (queryError) {
          console.error('Erro ao buscar planos:', queryError);
          throw new Error('Não foi possível carregar os planos disponíveis');
        }

        if (!plans || plans.length === 0) {
          throw new Error('Nenhum plano disponível no momento');
        }

        return plans as SubscriptionPlan[];
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar planos';
        
        toast({
          title: 'Erro ao carregar planos',
          description: errorMessage,
          variant: 'destructive'
        });
        
        throw error;
      }
    },
    staleTime: 1000 * 60 * 30, // 30 minutos
    cacheTime: 1000 * 60 * 60, // 1 hora
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return {
    plans: data || [],
    isLoading,
    error: error instanceof Error ? error : null,
    refetch
  };
}

interface UsePlanByIdResult {
  plan: SubscriptionPlan | null;
  isLoading: boolean;
  error: Error | null;
}

export function usePlanById(planId?: string): UsePlanByIdResult {
  const { plans, isLoading, error } = usePlans();
  
  const plan = plans.find(p => p.id === planId) || null;
  
  return {
    plan,
    isLoading,
    error
  };
}

interface UsePopularPlansResult {
  popularPlans: SubscriptionPlan[];
  isLoading: boolean;
  error: Error | null;
}

export function usePopularPlans(limit: number = 3): UsePopularPlansResult {
  const { plans, isLoading, error } = usePlans();
  
  // Ordenar por popularidade (assumindo que temos um campo popularity)
  const popularPlans = plans
    .filter(plan => plan.is_popular)
    .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    .slice(0, limit);
  
  return {
    popularPlans,
    isLoading,
    error
  };
}