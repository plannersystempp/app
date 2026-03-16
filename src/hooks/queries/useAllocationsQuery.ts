import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useTeam } from '@/contexts/TeamContext';
import { useToast } from '@/hooks/use-toast';
import { useBroadcastInvalidation } from './useBroadcastInvalidation';
import { supabase } from '@/integrations/supabase/client';
import type { Assignment } from '@/contexts/EnhancedDataContext';

// Query keys for consistent caching
export const allocationsKeys = {
  all: ['allocations'] as const,
  list: (teamId?: string) => ['allocations', 'list', teamId] as const,
  byEvent: (eventId?: string) => ['allocations', 'event', eventId] as const,
};

// Fetch allocations for a team
const fetchAllocations = async (teamId: string): Promise<Assignment[]> => {
  const { data, error } = await supabase
    .from('personnel_allocations')
    .select('*')
    .eq('team_id', teamId);

  if (error) throw error;
  return (data || []) as Assignment[];
};

// Hook to get allocations for the active team
export const useAllocationsQuery = () => {
  const { user } = useAuth();
  const { activeTeam } = useTeam();

  return useQuery({
    queryKey: allocationsKeys.list(activeTeam?.id),
    queryFn: () => fetchAllocations(activeTeam!.id),
    enabled: !!user && !!activeTeam?.id,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
};

// Hook to create new allocation
export const useCreateAllocationMutation = () => {
  const queryClient = useQueryClient();
  const { activeTeam } = useTeam();
  const { toast } = useToast();
  const { broadcast } = useBroadcastInvalidation();

  return useMutation({
    mutationFn: async (allocationData: Omit<Assignment, 'id' | 'created_at' | 'team_id'>) => {
      if (!activeTeam) throw new Error('No active team');

      const { data: existingAllocations } = await supabase
        .from('personnel_allocations')
        .select('id, work_days')
        .eq('event_id', allocationData.event_id)
        .eq('personnel_id', allocationData.personnel_id);

      const newDays = new Set((allocationData.work_days || []).filter(d => typeof d === 'string' && !!d.trim()));
      if (newDays.size > 0 && existingAllocations && existingAllocations.length > 0) {
        for (const existing of existingAllocations) {
          const existingDays = new Set(((existing as { work_days?: string[] | null }).work_days || []).filter(d => typeof d === 'string' && !!d.trim()));
          for (const day of newDays) {
            if (existingDays.has(day)) {
              throw new Error('Conflito de dias: já existe alocação para esta pessoa nos dias selecionados');
            }
          }
        }
      }

      const { data, error } = await supabase
        .from('personnel_allocations')
        .insert([{ ...allocationData, team_id: activeTeam.id }])
        .select()
        .single();

      if (error) throw error;
      return data as Assignment;
    },
    onSuccess: () => {
      // ✅ FASE 2: Invalidar imediatamente + refetch ativo
      queryClient.invalidateQueries({ 
        queryKey: allocationsKeys.all,
        refetchType: 'active'
      });
      
      // ✅ FASE 3: Notificar outras abas
      broadcast(allocationsKeys.all);
      
      toast({
        title: "Sucesso",
        description: "Alocação criada com sucesso!",
      });
    },
    onError: (error) => {
      console.error('Error creating allocation:', error);
      toast({
        title: "Erro",
        description: "Falha ao criar alocação",
        variant: "destructive"
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: allocationsKeys.all,
        refetchType: 'none'
      });
    },
  });
};

// Hook to delete allocation
export const useDeleteAllocationMutation = () => {
  const queryClient = useQueryClient();
  const { activeTeam } = useTeam();
  const { toast } = useToast();
  const { broadcast } = useBroadcastInvalidation();

  return useMutation({
    mutationFn: async (allocationId: string) => {
      const { error } = await supabase
        .from('personnel_allocations')
        .delete()
        .eq('id', allocationId)
        .eq('team_id', activeTeam!.id);

      if (error) throw error;
      return allocationId;
    },
    onSuccess: () => {
      // ✅ FASE 2: Invalidar imediatamente + refetch ativo
      queryClient.invalidateQueries({ 
        queryKey: allocationsKeys.all,
        refetchType: 'active'
      });
      
      // ✅ FASE 3: Notificar outras abas
      broadcast(allocationsKeys.all);
      
      toast({
        title: "Sucesso",
        description: "Alocação excluída com sucesso!",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: "Falha ao excluir alocação",
        variant: "destructive"
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ 
        queryKey: allocationsKeys.all,
        refetchType: 'none'
      });
    },
  });
};
