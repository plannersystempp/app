import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useTeam } from '@/contexts/TeamContext';
import { useToast } from '@/hooks/use-toast';
import { useBroadcastInvalidation } from './useBroadcastInvalidation';
import { supabase } from '@/integrations/supabase/client';
import type { Division } from '@/contexts/EnhancedDataContext';

// Query keys for consistent caching
export const divisionsKeys = {
  all: ['divisions'] as const,
  list: (teamId?: string) => ['divisions', 'list', teamId] as const,
  byEvent: (eventId?: string) => ['divisions', 'event', eventId] as const,
};

// Fetch divisions for a team
const fetchDivisions = async (teamId: string): Promise<Division[]> => {
  const { data, error } = await supabase
    .from('event_divisions')
    .select('*')
    .eq('team_id', teamId);

  if (error) throw error;
  return (data || []) as Division[];
};

// Hook to get divisions for the active team
export const useDivisionsQuery = () => {
  const { user } = useAuth();
  const { activeTeam } = useTeam();

  return useQuery({
    queryKey: divisionsKeys.list(activeTeam?.id),
    queryFn: () => fetchDivisions(activeTeam!.id),
    enabled: !!user && !!activeTeam?.id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

// Hook to create new division
export const useCreateDivisionMutation = () => {
  const queryClient = useQueryClient();
  const { activeTeam } = useTeam();
  const { toast } = useToast();
  const { broadcast } = useBroadcastInvalidation();

  return useMutation({
    mutationFn: async (divisionData: Omit<Division, 'id' | 'created_at' | 'team_id'>) => {
      if (!activeTeam) throw new Error('No active team');

      const { data, error } = await supabase
        .from('event_divisions')
        .insert([{ ...divisionData, team_id: activeTeam.id }])
        .select()
        .single();

      if (error) throw error;
      return data as Division;
    },
    onSuccess: () => {
      // ✅ FASE 2: Invalidar imediatamente + refetch ativo
      queryClient.invalidateQueries({ 
        queryKey: divisionsKeys.all,
        refetchType: 'active'
      });
      
      // ✅ FASE 3: Notificar outras abas
      broadcast(divisionsKeys.all);
      
      toast({
        title: "Sucesso",
        description: "Divisão criada com sucesso!",
      });
    },
    onError: (error) => {
      console.error('Error creating division:', error);
      toast({
        title: "Erro",
        description: "Falha ao criar divisão",
        variant: "destructive"
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: divisionsKeys.all,
        refetchType: 'none'
      });
    },
  });
};

// Hook to update division
export const useUpdateDivisionMutation = () => {
  const queryClient = useQueryClient();
  const { activeTeam } = useTeam();
  const { toast } = useToast();
  const { broadcast } = useBroadcastInvalidation();

  type DivisionUpdateInput = {
    id: string;
    name: string;
    description: string | null;
    default_entry_time: string | null;
    default_exit_time: string | null;
  };

  return useMutation({
    mutationFn: async (input: DivisionUpdateInput) => {
      const { id, ...update } = input;
      const { data, error } = await supabase
        .from('event_divisions')
        .update(update)
        .eq('id', id)
        .eq('team_id', activeTeam!.id)
        .select()
        .single();

      if (error) throw error;
      return data as Division;
    },
    onSuccess: () => {
      // ✅ FASE 2: Invalidar imediatamente + refetch ativo
      queryClient.invalidateQueries({ 
        queryKey: divisionsKeys.all,
        refetchType: 'active'
      });
      
      // ✅ FASE 3: Notificar outras abas
      broadcast(divisionsKeys.all);
      
      toast({
        title: "Sucesso",
        description: "Divisão atualizada com sucesso!",
      });
    },
    onError: (error) => {
      console.error('Error updating division:', error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar divisão",
        variant: "destructive"
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: divisionsKeys.all,
        refetchType: 'none'
      });
    },
  });
};

// Hook to delete division
export const useDeleteDivisionMutation = () => {
  const queryClient = useQueryClient();
  const { activeTeam } = useTeam();
  const { toast } = useToast();
  const { broadcast } = useBroadcastInvalidation();

  return useMutation({
    mutationFn: async (divisionId: string) => {
      const { error } = await supabase
        .from('event_divisions')
        .delete()
        .eq('id', divisionId)
        .eq('team_id', activeTeam!.id);

      if (error) throw error;
      return divisionId;
    },
    onSuccess: () => {
      // ✅ FASE 2: Invalidar imediatamente + refetch ativo
      queryClient.invalidateQueries({ 
        queryKey: divisionsKeys.all,
        refetchType: 'active'
      });
      
      // ✅ FASE 3: Notificar outras abas
      broadcast(divisionsKeys.all);
      
      toast({
        title: "Sucesso",
        description: "Divisão excluída com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao excluir divisão",
        variant: "destructive"
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: divisionsKeys.all,
        refetchType: 'none'
      });
    },
  });
};
